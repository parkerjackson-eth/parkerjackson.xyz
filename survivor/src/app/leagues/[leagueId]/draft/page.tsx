import { DraftRoom } from "@/components/DraftRoom";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { draftState, orderedMembers } from "@/lib/draft";
import { requireLeagueAccess } from "@/lib/session";

export const metadata = { title: "Draft room" };

// The board must reflect picks other people just made, so never serve it from
// the full route cache.
export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { user, access } = await requireLeagueAccess(leagueId);

  const [members, picks, castaways] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.draftPick.findMany({
      where: { leagueId },
      orderBy: { pickNumber: "asc" },
      include: { castaway: { select: { id: true, name: true, startingTribe: true } } },
    }),
    prisma.castaway.findMany({
      where: { seasonId: access.league.seasonId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        age: true,
        occupation: true,
        hometown: true,
        startingTribe: true,
        photoUrl: true,
      },
    }),
  ]);

  if (castaways.length === 0) {
    return (
      <EmptyState
        title="No cast to draft"
        description="This season has no castaways entered yet."
      />
    );
  }

  const draftMembers = members.map((m) => ({
    id: m.id,
    teamName: m.teamName,
    ownerName: m.user.displayName,
    draftPosition: m.draftPosition,
  }));

  const state = draftState(
    draftMembers,
    access.league.rosterSize,
    picks.length,
    access.league.draftLockAt,
  );

  const ownMembership = members.find((m) => m.userId === user.id);

  return (
    <DraftRoom
      leagueId={leagueId}
      rosterSize={access.league.rosterSize}
      draftLockAt={access.league.draftLockAt?.toISOString() ?? null}
      isCommissioner={access.isCommissioner}
      ownMemberId={ownMembership?.id ?? null}
      members={orderedMembers(draftMembers)}
      state={{
        totalPicks: state.totalPicks,
        picksMade: state.picksMade,
        complete: state.complete,
        locked: state.locked,
        onTheClock: state.onTheClock,
        upcoming: state.upcoming,
      }}
      picks={picks.map((pick) => ({
        id: pick.id,
        pickNumber: pick.pickNumber,
        memberId: pick.leagueMemberId,
        castawayId: pick.castawayId,
        castawayName: pick.castaway.name,
        tribe: pick.castaway.startingTribe,
      }))}
      castaways={castaways}
    />
  );
}
