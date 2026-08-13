import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyField } from "@/components/CopyField";
import {
  Badge,
  Card,
  EmptyState,
  Points,
  SectionTitle,
  buttonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { getLeagueScoreboard } from "@/lib/scoreboard";
import { eventLabel } from "@/lib/scoring";
import { requireLeagueAccess } from "@/lib/session";

export default async function LeagueHomePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { user, access } = await requireLeagueAccess(leagueId);

  const board = await getLeagueScoreboard(leagueId);
  if (!board) notFound();

  const scoredEpisodes = board.episodes.filter((e) => e.eventCount > 0);
  const latest = scoredEpisodes[scoredEpisodes.length - 1];

  // Everything that happened in the most recent scored episode, biggest movers
  // first, so the recap reads like a leaderboard of the week.
  const recap = latest
    ? [...board.castawayScores.entries()]
        .flatMap(([castawayId, score]) => {
          const events = score.events.filter((e) => e.episodeId === latest.id);
          if (events.length === 0) return [];
          const owner = board.drafted.get(castawayId);
          const name =
            board.standings
              .flatMap((team) => team.roster)
              .find((entry) => entry.castaway.id === castawayId)?.castaway.name ?? null;
          return [
            {
              castawayId,
              name,
              owner,
              events,
              total: events.reduce((sum, e) => sum + e.points, 0),
            },
          ];
        })
        .sort((a, b) => b.total - a.total)
    : [];

  // Undrafted castaways have no name in the standings roster, so fall back to
  // the cast list for the recap.
  const castNames = new Map(
    (
      await prisma.castaway.findMany({
        where: { seasonId: access.league.seasonId },
        select: { id: true, name: true },
      })
    ).map((c) => [c.id, c.name]),
  );

  const draftPicksMade = board.standings.reduce((sum, t) => sum + t.roster.length, 0);
  const draftComplete =
    board.standings.length > 0 &&
    draftPicksMade >= board.standings.length * access.league.rosterSize;

  return (
    <div className="space-y-8">
      {!draftComplete && (
        <Card className="border-amber-900/60 bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-200">The draft is not finished</p>
              <p className="mt-0.5 text-sm text-stone-400">
                {draftPicksMade} of {board.standings.length * access.league.rosterSize} picks
                made
                {access.league.draftLockAt
                  ? ` · locks ${formatDateTime(access.league.draftLockAt)}`
                  : ""}
              </p>
            </div>
            <Link href={`/leagues/${leagueId}/draft`} className={buttonClass}>
              Go to draft room
            </Link>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <SectionTitle>Standings</SectionTitle>
          <span className="mb-3 text-xs text-stone-500">
            {pluralize(board.standings.length, "team")}
          </span>
        </div>

        {board.standings.length === 0 ? (
          <EmptyState title="No teams yet" description="Share the join code to get started." />
        ) : (
          <Card className="p-0">
            <div className="scroll-x">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-stone-800 text-left text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-2 py-3 font-semibold">Team</th>
                    <th className="px-2 py-3 text-right font-semibold">Alive</th>
                    <th className="px-2 py-3 text-right font-semibold">Last ep</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {board.standings.map((team) => (
                    <tr
                      key={team.memberId}
                      className={`border-b border-stone-900 last:border-0 ${
                        team.userId === user.id ? "bg-amber-500/[0.07]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-stone-500">{team.rank}</td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/leagues/${leagueId}/team/${team.memberId}`}
                          className="font-semibold text-stone-100 hover:text-amber-300"
                        >
                          {team.teamName}
                        </Link>
                        <div className="text-xs text-stone-500">{team.ownerName}</div>
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-stone-400">
                        {team.activeCount}/{team.roster.length}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Points value={team.lastEpisodePoints} />
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-amber-300">
                        {team.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>
          {latest
            ? `Episode ${latest.number} recap${latest.title ? ` · ${latest.title}` : ""}`
            : "Latest episode"}
        </SectionTitle>

        {!latest ? (
          <EmptyState
            title="Nothing logged yet"
            description={
              access.isCommissioner
                ? "Once the first episode airs, log what happened and the standings will fill in."
                : "The commissioner has not logged an episode yet."
            }
            action={
              access.isCommissioner ? (
                <Link href={`/leagues/${leagueId}/episodes`} className={buttonClass}>
                  Log an episode
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <p className="mb-4 text-xs text-stone-500">
              Aired {formatDate(latest.airDate)}
              {latest.notes ? ` · ${latest.notes}` : ""}
            </p>

            <ul className="space-y-3">
              {recap.map((row) => (
                <li
                  key={row.castawayId}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-stone-900 pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-100">
                        {row.name ?? castNames.get(row.castawayId) ?? "Unknown"}
                      </span>
                      {row.owner ? (
                        <Badge tone="accent">{row.owner.teamName}</Badge>
                      ) : (
                        <Badge>Undrafted</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-400">
                      {row.events
                        .map(
                          (e) =>
                            `${eventLabel(e.eventType)}${e.count > 1 ? ` ×${e.count}` : ""}`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                  <Points value={row.total} className="text-lg" />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Invite a friend</SectionTitle>
          <p className="mb-3 text-sm text-stone-400">
            They sign up, then enter this code to join.
          </p>
          <CopyField value={access.league.joinCode} />
        </Card>

        <Card>
          <SectionTitle>League</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Season</dt>
              <dd className="text-right text-stone-200">{access.league.season.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Roster size</dt>
              <dd className="text-stone-200">{access.league.rosterSize} per team</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Draft lock</dt>
              <dd className="text-right text-stone-200">
                {formatDateTime(access.league.draftLockAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Episodes logged</dt>
              <dd className="text-stone-200">{scoredEpisodes.length}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <Link
              href={`/leagues/${leagueId}/cast`}
              className={`${secondaryButtonClass} w-full`}
            >
              Browse the cast
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
