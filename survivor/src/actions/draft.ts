"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { fail, ok, str, type ActionState } from "@/lib/actions";
import { memberForPick } from "@/lib/draft";
import { requireCommissioner, requireLeagueAccess } from "@/lib/session";

export async function makePickAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  const castawayId = str(formData, "castawayId");
  const requestedMemberId = str(formData, "memberId");

  const { user, access } = await requireLeagueAccess(leagueId);

  if (access.league.draftLockAt && access.league.draftLockAt.getTime() <= Date.now()) {
    return fail("The draft is locked. No further picks can be made.");
  }

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: { select: { displayName: true } } },
  });

  const draftMembers = members.map((m) => ({
    id: m.id,
    teamName: m.teamName,
    ownerName: m.user.displayName,
    draftPosition: m.draftPosition,
  }));

  const picksMade = await prisma.draftPick.count({ where: { leagueId } });
  const pickNumber = picksMade + 1;

  const onTheClock = memberForPick(draftMembers, access.league.rosterSize, pickNumber);
  if (!onTheClock) return fail("Every roster is already full");

  // The commissioner can enter a pick for anyone (the manual-draft path).
  // Everyone else can only pick for their own team, and only on their turn.
  let memberId: string;
  if (access.isCommissioner) {
    memberId = requestedMemberId || onTheClock.id;
    if (memberId !== onTheClock.id) {
      return fail(`It is ${onTheClock.teamName}'s pick, not that team's`);
    }
  } else {
    const own = members.find((m) => m.userId === user.id);
    if (!own) return fail("You are not in this league");
    if (own.id !== onTheClock.id) return fail("It is not your pick yet");
    memberId = own.id;
  }

  const castaway = await prisma.castaway.findFirst({
    where: { id: castawayId, seasonId: access.league.seasonId },
  });
  if (!castaway) return fail("That castaway is not in this season");

  try {
    await prisma.draftPick.create({
      data: { leagueId, leagueMemberId: memberId, castawayId, pickNumber },
    });
  } catch (error) {
    // The unique indexes on (leagueId, castawayId) and (leagueId, pickNumber)
    // are what actually stop a double draft when two people click at once.
    if ((error as { code?: string }).code === "P2002") {
      return fail("Too slow — that castaway or pick slot was just taken. Try again.");
    }
    throw error;
  }

  revalidatePath(`/leagues/${leagueId}/draft`);
  revalidatePath(`/leagues/${leagueId}`);
  return ok(`${castaway.name} drafted`);
}

export async function undoLastPickAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  const last = await prisma.draftPick.findFirst({
    where: { leagueId },
    orderBy: { pickNumber: "desc" },
    include: { castaway: { select: { name: true } } },
  });

  if (!last) return fail("There are no picks to undo");

  await prisma.draftPick.delete({ where: { id: last.id } });

  revalidatePath(`/leagues/${leagueId}/draft`);
  revalidatePath(`/leagues/${leagueId}`);
  return ok(`Undid pick ${last.pickNumber} (${last.castaway.name})`);
}

export async function randomizeDraftOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  const picksMade = await prisma.draftPick.count({ where: { leagueId } });
  if (picksMade > 0) {
    return fail("The draft has already started. Undo the picks before reordering.");
  }

  const members = await prisma.leagueMember.findMany({ where: { leagueId } });

  // Fisher-Yates.
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  await prisma.$transaction(
    shuffled.map((member, index) =>
      prisma.leagueMember.update({
        where: { id: member.id },
        data: { draftPosition: index + 1 },
      }),
    ),
  );

  revalidatePath(`/leagues/${leagueId}/draft`);
  revalidatePath(`/leagues/${leagueId}/settings`);
  return ok("Draft order randomized");
}

export async function setDraftOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leagueId = str(formData, "leagueId");
  await requireCommissioner(leagueId);

  const members = await prisma.leagueMember.findMany({ where: { leagueId } });

  const updates: { id: string; draftPosition: number }[] = [];
  for (const member of members) {
    const raw = str(formData, `position:${member.id}`);
    const position = Number.parseInt(raw, 10);
    if (!Number.isFinite(position) || position < 1 || position > members.length) {
      return fail(`Positions must be numbers from 1 to ${members.length}`);
    }
    updates.push({ id: member.id, draftPosition: position });
  }

  const seen = new Set(updates.map((u) => u.draftPosition));
  if (seen.size !== updates.length) return fail("Each team needs a different position");

  await prisma.$transaction(
    updates.map((u) =>
      prisma.leagueMember.update({
        where: { id: u.id },
        data: { draftPosition: u.draftPosition },
      }),
    ),
  );

  revalidatePath(`/leagues/${leagueId}/draft`);
  revalidatePath(`/leagues/${leagueId}/settings`);
  return ok("Draft order saved");
}
