import { prisma } from "@/lib/db";
import {
  ELIMINATION_EVENTS,
  resolveRules,
  scoreEvent,
  type ResolvedRule,
} from "@/lib/scoring";

export type ScoredEvent = {
  id: string;
  episodeId: string;
  episodeNumber: number;
  eventType: string;
  count: number;
  points: number;
  notes: string | null;
};

export type CastawayScore = {
  castawayId: string;
  total: number;
  /** episodeId -> points scored in that episode */
  byEpisode: Record<string, number>;
  events: ScoredEvent[];
};

export type RosterEntry = {
  pickNumber: number;
  castaway: {
    id: string;
    name: string;
    photoUrl: string | null;
    startingTribe: string | null;
    status: string;
    eliminationEpisode: number | null;
    finalPlacement: number | null;
  };
  score: CastawayScore;
};

export type TeamStanding = {
  rank: number;
  memberId: string;
  userId: string;
  teamName: string;
  ownerName: string;
  total: number;
  /** Points from the most recently logged episode, for the "this week" column. */
  lastEpisodePoints: number;
  activeCount: number;
  roster: RosterEntry[];
};

export type EpisodeSummary = {
  id: string;
  number: number;
  title: string | null;
  airDate: Date | null;
  notes: string | null;
  eventCount: number;
};

export type LeagueScoreboard = {
  standings: TeamStanding[];
  episodes: EpisodeSummary[];
  /** Every castaway in the season, scored, whether drafted or not. */
  castawayScores: Map<string, CastawayScore>;
  rules: Map<string, ResolvedRule>;
  /** castawayId -> the team that drafted them, for the cast hub. */
  drafted: Map<string, { memberId: string; teamName: string }>;
};

const emptyScore = (castawayId: string): CastawayScore => ({
  castawayId,
  total: 0,
  byEpisode: {},
  events: [],
});

/**
 * Scores an entire league in one pass.
 *
 * Everything on the standings, cast hub, and my-team screens comes from here,
 * so there is exactly one place where points are decided.
 */
export async function getLeagueScoreboard(
  leagueId: string,
): Promise<LeagueScoreboard | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      picks: { include: { castaway: true } },
    },
  });

  if (!league) return null;

  const [episodes, storedRules, castaways] = await Promise.all([
    prisma.episode.findMany({
      where: { seasonId: league.seasonId },
      orderBy: { number: "asc" },
      include: { events: true },
    }),
    prisma.scoringRule.findMany({
      where: {
        OR: [{ seasonId: league.seasonId }, { leagueId: league.id }],
      },
    }),
    prisma.castaway.findMany({
      where: { seasonId: league.seasonId },
      select: { id: true },
    }),
  ]);

  const rules = resolveRules(storedRules);

  const castawayScores = new Map<string, CastawayScore>(
    castaways.map((c) => [c.id, emptyScore(c.id)]),
  );

  for (const episode of episodes) {
    for (const event of episode.events) {
      const score =
        castawayScores.get(event.castawayId) ?? emptyScore(event.castawayId);
      castawayScores.set(event.castawayId, score);

      const points = scoreEvent(event, rules);
      score.total += points;
      score.byEpisode[episode.id] = (score.byEpisode[episode.id] ?? 0) + points;
      score.events.push({
        id: event.id,
        episodeId: episode.id,
        episodeNumber: episode.number,
        eventType: event.eventType,
        count: event.count,
        points,
        notes: event.notes,
      });
    }
  }

  const lastEpisodeId = episodes.filter((e) => e.events.length > 0).pop()?.id;

  const picksByMember = new Map<string, typeof league.picks>();
  const drafted = new Map<string, { memberId: string; teamName: string }>();

  for (const pick of league.picks) {
    const list = picksByMember.get(pick.leagueMemberId) ?? [];
    list.push(pick);
    picksByMember.set(pick.leagueMemberId, list);

    const member = league.members.find((m) => m.id === pick.leagueMemberId);
    if (member) {
      drafted.set(pick.castawayId, {
        memberId: member.id,
        teamName: member.teamName,
      });
    }
  }

  const unranked = league.members.map((member) => {
    const picks = (picksByMember.get(member.id) ?? []).sort(
      (a, b) => a.pickNumber - b.pickNumber,
    );

    const roster: RosterEntry[] = picks.map((pick) => ({
      pickNumber: pick.pickNumber,
      castaway: {
        id: pick.castaway.id,
        name: pick.castaway.name,
        photoUrl: pick.castaway.photoUrl,
        startingTribe: pick.castaway.startingTribe,
        status: pick.castaway.status,
        eliminationEpisode: pick.castaway.eliminationEpisode,
        finalPlacement: pick.castaway.finalPlacement,
      },
      score: castawayScores.get(pick.castawayId) ?? emptyScore(pick.castawayId),
    }));

    return {
      memberId: member.id,
      userId: member.userId,
      teamName: member.teamName,
      ownerName: member.user.displayName,
      total: roster.reduce((sum, r) => sum + r.score.total, 0),
      lastEpisodePoints: lastEpisodeId
        ? roster.reduce((sum, r) => sum + (r.score.byEpisode[lastEpisodeId] ?? 0), 0)
        : 0,
      activeCount: roster.filter(
        (r) => r.castaway.status !== "eliminated" && r.castaway.status !== "jury",
      ).length,
      roster,
    };
  });

  unranked.sort((a, b) => b.total - a.total || a.teamName.localeCompare(b.teamName));

  // Teams on the same score share a rank, and the next rank skips accordingly.
  const standings: TeamStanding[] = [];
  let lastTotal: number | null = null;
  let lastRank = 0;
  unranked.forEach((team, index) => {
    const rank = lastTotal !== null && team.total === lastTotal ? lastRank : index + 1;
    lastTotal = team.total;
    lastRank = rank;
    standings.push({ rank, ...team });
  });

  return {
    standings,
    episodes: episodes.map((e) => ({
      id: e.id,
      number: e.number,
      title: e.title,
      airDate: e.airDate,
      notes: e.notes,
      eventCount: e.events.length,
    })),
    castawayScores,
    rules,
    drafted,
  };
}

/**
 * True once the castaway has an elimination event logged or has been marked
 * eliminated on the cast sheet. Used to grey out dead roster slots.
 */
export function isRosterSlotDead(entry: RosterEntry): boolean {
  if (entry.castaway.status === "eliminated") return true;
  return entry.score.events.some((e) => ELIMINATION_EVENTS.has(e.eventType));
}
