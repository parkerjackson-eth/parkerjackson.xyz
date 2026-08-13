import Link from "next/link";
import { notFound } from "next/navigation";

import { EditEpisodeForm } from "@/components/EpisodeForms";
import { EpisodeEntryForm } from "@/components/EpisodeEntryForm";
import { Card, SectionTitle, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/format";
import { resolveRules } from "@/lib/scoring";
import { requireCommissioner } from "@/lib/session";

export const metadata = { title: "Log results" };

export default async function EpisodeEntryPage({
  params,
}: {
  params: Promise<{ leagueId: string; episodeId: string }>;
}) {
  const { leagueId, episodeId } = await params;
  const { access } = await requireCommissioner(leagueId);

  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, seasonId: access.league.seasonId },
    include: { events: true },
  });
  if (!episode) notFound();

  const [castaways, storedRules, picks, members] = await Promise.all([
    prisma.castaway.findMany({
      where: { seasonId: access.league.seasonId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.scoringRule.findMany({
      where: { OR: [{ seasonId: access.league.seasonId }, { leagueId }] },
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      select: { castawayId: true, leagueMemberId: true },
    }),
    prisma.leagueMember.findMany({
      where: { leagueId },
      select: { id: true, teamName: true },
    }),
  ]);

  const rules = resolveRules(storedRules);

  // Only the events logged in EARLIER episodes matter for the "already scored"
  // warning on once-per-season rules — this episode's own rows are editable.
  const priorEvents = await prisma.episodeEvent.findMany({
    where: {
      episode: { seasonId: access.league.seasonId, number: { lt: episode.number } },
    },
    select: { castawayId: true, eventType: true },
  });

  const teamByCastaway: Record<string, string> = {};
  const teamNames = new Map(members.map((m) => [m.id, m.teamName]));
  for (const pick of picks) {
    const name = teamNames.get(pick.leagueMemberId);
    if (name) teamByCastaway[pick.castawayId] = name;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            Episode {episode.number}
            {episode.title ? `: ${episode.title}` : ""}
          </h2>
          <p className="text-sm text-stone-400">
            Tick what happened. Points update live as you go.
          </p>
        </div>
        <Link href={`/leagues/${leagueId}/episodes`} className={secondaryButtonClass}>
          All episodes
        </Link>
      </div>

      <EpisodeEntryForm
        episodeId={episode.id}
        castaways={castaways.map((c) => ({
          id: c.id,
          name: c.name,
          photoUrl: c.photoUrl,
          startingTribe: c.startingTribe,
          status: c.status,
        }))}
        existing={episode.events.map((e) => ({
          castawayId: e.castawayId,
          eventType: e.eventType,
          count: e.count,
          pointOverride: e.pointOverride,
        }))}
        priorEvents={priorEvents}
        rules={Object.fromEntries(
          [...rules.values()].map((r) => [r.eventType, { points: r.points, enabled: r.enabled }]),
        )}
        teamByCastaway={teamByCastaway}
      />

      <Card>
        <SectionTitle>Episode details</SectionTitle>
        <EditEpisodeForm
          episodeId={episode.id}
          title={episode.title ?? ""}
          airDate={toDateInput(episode.airDate)}
          notes={episode.notes ?? ""}
          redirectAfterDelete={`/leagues/${leagueId}/episodes`}
        />
      </Card>
    </div>
  );
}
