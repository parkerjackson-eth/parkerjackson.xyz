import Link from "next/link";

import { AppShell } from "@/components/SiteHeader";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Points,
  buttonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getLeagueScoreboard } from "@/lib/scoreboard";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Your leagues" };

export default async function DashboardPage() {
  const user = await requireUser();

  const leagues = await prisma.league.findMany({
    where: {
      OR: [{ commissionerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      season: true,
      _count: { select: { members: true } },
    },
  });

  const boards = await Promise.all(
    leagues.map(async (league) => {
      const scoreboard = await getLeagueScoreboard(league.id);

      const nextEpisode = await prisma.episode.findFirst({
        where: { seasonId: league.seasonId, airDate: { gte: new Date() } },
        orderBy: { airDate: "asc" },
      });

      return { league, scoreboard, nextEpisode };
    }),
  );

  return (
    <AppShell>
      <PageHeader
        title={`Hi, ${user.displayName}`}
        subtitle="Your leagues, and where everyone stands."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/leagues/join" className={secondaryButtonClass}>
              Join with a code
            </Link>
            <Link href="/leagues/new" className={buttonClass}>
              New league
            </Link>
          </div>
        }
      />

      {leagues.length === 0 ? (
        <EmptyState
          title="No leagues yet"
          description="Start one and share the join code with your friends, or join a league someone else already set up."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/leagues/new" className={buttonClass}>
                Create a league
              </Link>
              <Link href="/leagues/join" className={secondaryButtonClass}>
                Join with a code
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {boards.map(({ league, scoreboard, nextEpisode }) => {
            const standings = scoreboard?.standings ?? [];
            const you = standings.find((team) => team.userId === user.id);
            const top = standings.slice(0, 4);

            return (
              <Card key={league.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/leagues/${league.id}`}
                      className="text-lg font-bold text-white transition hover:text-amber-300"
                    >
                      {league.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-stone-400">
                      {league.season.name} · {league._count.members} team
                      {league._count.members === 1 ? "" : "s"}
                    </p>
                  </div>
                  {league.commissionerId === user.id && <Badge tone="accent">Commish</Badge>}
                </div>

                {you && (
                  <div className="mt-4 flex items-center gap-4 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        Your rank
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-white">
                        {you.rank}
                        <span className="text-sm font-medium text-stone-500">
                          {" "}
                          of {standings.length}
                        </span>
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        Points
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-amber-300">
                        {you.total}
                      </p>
                    </div>
                  </div>
                )}

                {top.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm">
                    {top.map((team) => (
                      <li
                        key={team.memberId}
                        className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                          team.userId === user.id ? "bg-amber-500/10" : ""
                        }`}
                      >
                        <span className="w-5 shrink-0 text-right font-mono text-xs text-stone-500">
                          {team.rank}
                        </span>
                        <span className="truncate text-stone-200">{team.teamName}</span>
                        <span className="ml-auto shrink-0">
                          <Points value={team.total} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-3 text-xs text-stone-500">
                  <span>
                    {nextEpisode
                      ? `Episode ${nextEpisode.number} airs ${formatDate(nextEpisode.airDate)}`
                      : league.season.premiereDate &&
                          league.season.premiereDate.getTime() > Date.now()
                        ? `Premieres ${formatDate(league.season.premiereDate)}`
                        : "No upcoming episode scheduled"}
                  </span>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="font-semibold text-amber-400 hover:text-amber-300"
                  >
                    Open league →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
