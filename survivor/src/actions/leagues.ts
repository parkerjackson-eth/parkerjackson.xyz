"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  fail,
  generateJoinCode,
  int,
  ok,
  str,
  type ActionState,
} from "@/lib/actions";
import { EVENT_TYPES } from "@/lib/scoring";
import { requireCommissioner, requireUser } from "@/lib/session";

const MIN_ROSTER = 1;
const MAX_ROSTER = 10;

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const name = str(formData, "name");
  const seasonId = str(formData, "seasonId");
  const teamName = str(formData, "teamName") || `${user.displayName}'s team`;
  const rosterSize = int(formData, "rosterSize") ?? 3;
  const rawLock = str(formData, "draftLockAt");

  if (name.length < 3) return fail("Give the league a name of at least 3 characters");
  if (!seasonId) return fail("Pick a season");
  if (rosterSize < MIN_ROSTER || rosterSize > MAX_ROSTER) {
    return fail(`Roster size must be between ${MIN_ROSTER} and ${MAX_ROSTER}`);
  }

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return fail("That season no longer exists");

  let draftLockAt: Date | null = null;
  if (rawLock) {
    const parsed = new Date(rawLock);
    if (Number.isNaN(parsed.getTime())) return fail("Draft lock time is not a valid date");
    draftLockAt = parsed;
  }

  // Retry on the (very unlikely) chance of a join code collision.
  let league = null;
  for (let attempt = 0; attempt < 5 && !league; attempt++) {
    try {
      league = await prisma.league.create({
        data: {
          name,
          seasonId,
          commissionerId: user.id,
          joinCode: generateJoinCode(),
          rosterSize,
          draftLockAt,
          members: {
            create: { userId: user.id, teamName, draftPosition: 1 },
          },
        },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
    }
  }

  if (!league) return fail("Could not create the league. Please try again.");

  redirect(`/leagues/${league.id}`);
}

export async function joinLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const joinCode = str(formData, "joinCode").toUpperCase();
  const teamName = str(formData, "teamName") || `${user.displayName}'s team`;

  if (!joinCode) return fail("Enter a join code");

  const league = await prisma.league.findUnique({
    where: { joinCode },
    include: { members: true },
  });

  if (!league) return fail("No league found with that code");

  if (league.members.some((m) => m.userId === user.id)) {
    redirect(`/leagues/${league.id}`);
  }

  if (league.draftLockAt && league.draftLockAt.getTime() < Date.now()) {
    return fail("That league's draft has already locked");
  }

  await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      userId: user.id,
      teamName,
      draftPosition: league.members.length + 1,
    },
  });

  redirect(`/leagues/${league.id}`);
}

export async function updateLeagueSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  const { access } = await requireCommissioner(leagueId);

  const name = str(formData, "name");
  const rosterSize = int(formData, "rosterSize") ?? access.league.rosterSize;
  const rawLock = str(formData, "draftLockAt");

  if (name.length < 3) return fail("Give the league a name of at least 3 characters");
  if (rosterSize < MIN_ROSTER || rosterSize > MAX_ROSTER) {
    return fail(`Roster size must be between ${MIN_ROSTER} and ${MAX_ROSTER}`);
  }

  const maxPicks = await prisma.draftPick.groupBy({
    by: ["leagueMemberId"],
    where: { leagueId },
    _count: true,
  });
  const largestRoster = maxPicks.reduce((max, row) => Math.max(max, row._count), 0);
  if (rosterSize < largestRoster) {
    return fail(
      `A team already holds ${largestRoster} castaways. Remove picks before shrinking the roster.`,
    );
  }

  let draftLockAt: Date | null = null;
  if (rawLock) {
    const parsed = new Date(rawLock);
    if (Number.isNaN(parsed.getTime())) return fail("Draft lock time is not a valid date");
    draftLockAt = parsed;
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { name, rosterSize, draftLockAt },
  });

  revalidatePath(`/leagues/${leagueId}`);
  return ok("League settings saved");
}

export async function regenerateJoinCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.league.update({
        where: { id: leagueId },
        data: { joinCode: generateJoinCode() },
      });
      revalidatePath(`/leagues/${leagueId}/settings`);
      return ok("New join code generated");
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }

  return fail("Could not generate a new code. Please try again.");
}

export async function updateTeamNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const memberId = str(formData, "memberId");
  const teamName = str(formData, "teamName");

  if (teamName.length < 2) return fail("Team names need at least 2 characters");

  const member = await prisma.leagueMember.findUnique({
    where: { id: memberId },
    include: { league: { select: { id: true, commissionerId: true } } },
  });
  if (!member) return fail("That team no longer exists");

  const allowed = member.userId === user.id || member.league.commissionerId === user.id;
  if (!allowed) return fail("You cannot rename that team");

  await prisma.leagueMember.update({ where: { id: memberId }, data: { teamName } });

  revalidatePath(`/leagues/${member.league.id}`);
  return ok("Team name saved");
}

export async function removeMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  const memberId = str(formData, "memberId");
  const { access } = await requireCommissioner(leagueId);

  const member = await prisma.leagueMember.findFirst({
    where: { id: memberId, leagueId },
  });
  if (!member) return fail("That member is not in this league");

  if (member.userId === access.league.commissionerId) {
    return fail("The commissioner cannot be removed from their own league");
  }

  // Their draft picks go with them, freeing those castaways to be re-drafted.
  await prisma.leagueMember.delete({ where: { id: memberId } });

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/settings`);
  return ok("Member removed");
}

/**
 * Writes the league's own copy of the scoring table. Every event type is saved
 * so the league is fully self-describing from then on, and later edits to the
 * season defaults will not silently move this league's goalposts.
 */
export async function updateScoringRulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  const rows = EVENT_TYPES.map((def) => {
    const points = int(formData, `points:${def.key}`);
    return {
      eventType: def.key,
      points: points === null ? def.points : points,
      enabled: formData.get(`enabled:${def.key}`) === "on",
    };
  });

  for (const row of rows) {
    if (row.points < -100 || row.points > 500) {
      return fail("Point values must be between -100 and 500");
    }
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.scoringRule.upsert({
        where: { leagueId_eventType: { leagueId, eventType: row.eventType } },
        create: { leagueId, eventType: row.eventType, points: row.points, enabled: row.enabled },
        update: { points: row.points, enabled: row.enabled },
      }),
    ),
  );

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/settings`);
  return ok("Scoring rules saved. Standings have been recalculated.");
}

export async function resetScoringRulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  await prisma.scoringRule.deleteMany({ where: { leagueId } });

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/settings`);
  return ok("League scoring reset to the season defaults");
}
