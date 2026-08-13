import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamNameForm } from "@/components/TeamNameForm";
import {
  Badge,
  Card,
  EmptyState,
  Points,
  SectionTitle,
  StatusBadge,
  buttonClass,
} from "@/components/ui";
import { ordinal } from "@/lib/format";
import { getLeagueScoreboard, isRosterSlotDead } from "@/lib/scoreboard";
import { eventLabel } from "@/lib/scoring";
import { requireLeagueAccess } from "@/lib/session";

export const metadata = { title: "Team" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ leagueId: string; memberId: string }>;
}) {
  const { leagueId, memberId } = await params;
  const { user, access } = await requireLeagueAccess(leagueId);

  const board = await getLeagueScoreboard(leagueId);
  if (!board) notFound();

  const team = board.standings.find((t) => t.memberId === memberId);
  if (!team) notFound();

  const isOwnTeam = team.userId === user.id;
  const episodeNumbers = new Map(board.episodes.map((e) => [e.id, e.number]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {isOwnTeam ? "Your team" : team.ownerName}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white">{team.teamName}</h2>
          <p className="mt-1 text-sm text-stone-400">
            {ordinal(team.rank)} of {board.standings.length} · {team.activeCount} still in
            the game
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Total
          </p>
          <p className="text-4xl font-bold tabular-nums text-amber-300">{team.total}</p>
        </div>
      </div>

      {team.roster.length === 0 ? (
        <EmptyState
          title="No castaways drafted yet"
          description={
            isOwnTeam
              ? "Head to the draft room when it is your turn."
              : "This team has not made a pick yet."
          }
          action={
            <Link href={`/leagues/${leagueId}/draft`} className={buttonClass}>
              Draft room
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {team.roster.map((entry) => {
            const dead = isRosterSlotDead(entry);

            // Group this castaway's events by episode for the breakdown.
            const byEpisode = new Map<string, typeof entry.score.events>();
            for (const event of entry.score.events) {
              const list = byEpisode.get(event.episodeId) ?? [];
              list.push(event);
              byEpisode.set(event.episodeId, list);
            }

            return (
              <Card key={entry.castaway.id} className={dead ? "opacity-70" : ""}>
                <div className="flex items-start gap-3">
                  {entry.castaway.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.castaway.photoUrl}
                      alt=""
                      className={`h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-stone-700 ${
                        dead ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-stone-800 text-lg font-bold text-stone-500 ring-1 ring-stone-700">
                      {entry.castaway.name.slice(0, 1)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">{entry.castaway.name}</h3>
                      <StatusBadge status={entry.castaway.status} />
                      {entry.castaway.startingTribe && (
                        <Badge>{entry.castaway.startingTribe}</Badge>
                      )}
                      <span className="text-xs text-stone-600">
                        pick {entry.pickNumber}
                      </span>
                    </div>
                    {dead && (
                      <p className="mt-1 text-xs text-stone-500">
                        Roster slot is dead
                        {entry.castaway.eliminationEpisode
                          ? ` — out in episode ${entry.castaway.eliminationEpisode}`
                          : ""}
                        . No further points.
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 font-mono text-2xl font-bold tabular-nums text-amber-300">
                    {entry.score.total}
                  </span>
                </div>

                {byEpisode.size > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-stone-900 pt-3">
                    {[...byEpisode.entries()]
                      .sort(
                        (a, b) =>
                          (episodeNumbers.get(b[0]) ?? 0) - (episodeNumbers.get(a[0]) ?? 0),
                      )
                      .map(([episodeId, events]) => (
                        <div key={episodeId} className="flex gap-3 text-sm">
                          <span className="w-16 shrink-0 font-mono text-xs text-stone-500">
                            Ep {episodeNumbers.get(episodeId)}
                          </span>
                          <ul className="min-w-0 flex-1 space-y-0.5">
                            {events.map((event) => (
                              <li key={event.id} className="flex justify-between gap-3">
                                <span className="text-stone-300">
                                  {eventLabel(event.eventType)}
                                  {event.count > 1 && (
                                    <span className="text-stone-500"> ×{event.count}</span>
                                  )}
                                </span>
                                <Points value={event.points} />
                              </li>
                            ))}
                          </ul>
                          <span className="w-12 shrink-0 text-right">
                            <Points value={entry.score.byEpisode[episodeId] ?? 0} />
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-4 border-t border-stone-900 pt-3 text-sm text-stone-500">
                    No points scored yet.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {(isOwnTeam || access.isCommissioner) && (
        <Card>
          <SectionTitle>Team name</SectionTitle>
          <TeamNameForm memberId={team.memberId} teamName={team.teamName} />
        </Card>
      )}
    </div>
  );
}
