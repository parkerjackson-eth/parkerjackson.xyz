import Link from "next/link";

import { AppShell } from "@/components/SiteHeader";
import { Badge, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, ordinal } from "@/lib/format";
import { getLeagueScoreboard } from "@/lib/scoreboard";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Season archive" };

export default async function ArchivePage() {
  const user = await requireUser();

  // Completed seasons, but only the leagues this user was actually part of.
  const seasons = await prisma.season.findMany({
    where: { status: "completed" },
    orderBy: [{ premiereDate: "desc" }, { createdAt: "desc" }],
    include: {
      castaways: {
        where: { status: "winner" },
        select: { name: true, photoUrl: true },
      },
      leagues: {
        where: user.isSuperAdmin
          ? undefined
          : {
              OR: [
                { commissionerId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            },
        select: { id: true, name: true },
      },
    },
  });

  const withStandings = await Promise.all(
    seasons.map(async (season) => ({
      season,
      leagues: await Promise.all(
        season.leagues.map(async (league) => ({
          league,
          board: await getLeagueScoreboard(league.id),
        })),
      ),
    })),
  );

  const anyLeagues = withStandings.some((entry) => entry.leagues.length > 0);

  return (
    <AppShell>
      <PageHeader
        title="Season archive"
        subtitle="Finished seasons and the final standings of every league you played in."
      />

      {seasons.length === 0 || !anyLeagues ? (
        <EmptyState
          title="Nothing archived yet"
          description="Once a season is marked completed, its final standings show up here."
        />
      ) : (
        <div className="space-y-8">
          {withStandings.map(({ season, leagues }) => {
            if (leagues.length === 0) return null;
            const winner = season.castaways[0];

            return (
              <section key={season.id}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{season.name}</h2>
                  <Badge>completed</Badge>
                  <span className="text-xs text-stone-500">
                    Premiered {formatDate(season.premiereDate)}
                  </span>
                </div>

                {winner && (
                  <p className="mb-4 text-sm text-stone-400">
                    Sole Survivor:{" "}
                    <strong className="text-amber-300">{winner.name}</strong>
                  </p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {leagues.map(({ league, board }) => (
                    <Card key={league.id}>
                      <SectionTitle>
                        <Link href={`/leagues/${league.id}`} className="hover:text-amber-300">
                          {league.name}
                        </Link>
                      </SectionTitle>

                      <ol className="space-y-1 text-sm">
                        {(board?.standings ?? []).map((team) => (
                          <li
                            key={team.memberId}
                            className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                              team.rank === 1 ? "bg-amber-500/10" : ""
                            } ${team.userId === user.id ? "ring-1 ring-inset ring-stone-700" : ""}`}
                          >
                            <span className="w-8 shrink-0 font-mono text-xs text-stone-500">
                              {ordinal(team.rank)}
                            </span>
                            <span className="min-w-0 truncate">
                              <span className="text-stone-100">{team.teamName}</span>
                              <span className="text-stone-500"> · {team.ownerName}</span>
                            </span>
                            <span className="ml-auto shrink-0 font-mono font-bold tabular-nums text-amber-300">
                              {team.total}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
