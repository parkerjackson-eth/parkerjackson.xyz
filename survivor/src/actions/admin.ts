"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { date, fail, int, ok, optionalStr, str, type ActionState } from "@/lib/actions";
import { canManageSeasonResults } from "@/lib/permissions";
import { EVENT_TYPES } from "@/lib/scoring";
import { requireSuperAdmin, requireUser } from "@/lib/session";

const SEASON_STATUSES = ["upcoming", "active", "completed"];
const CASTAWAY_STATUSES = ["active", "jury", "finalist", "winner", "eliminated"];

export async function createSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const name = str(formData, "name");
  if (name.length < 2) return fail("Give the season a name");

  const status = str(formData, "status") || "upcoming";
  if (!SEASON_STATUSES.includes(status)) return fail("Unknown season status");

  const season = await prisma.season.create({
    data: {
      name,
      status,
      premiereDate: date(formData, "premiereDate"),
      notes: optionalStr(formData, "notes"),
      // Seed the season with the catalog defaults so a commissioner has a real
      // table to edit rather than an empty screen.
      scoringRules: {
        create: EVENT_TYPES.map((def) => ({
          eventType: def.key,
          points: def.points,
          enabled: def.defaultEnabled ?? true,
        })),
      },
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/seasons/${season.id}`);
}

export async function updateSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const seasonId = str(formData, "seasonId");
  const name = str(formData, "name");
  const status = str(formData, "status");

  if (name.length < 2) return fail("Give the season a name");
  if (!SEASON_STATUSES.includes(status)) return fail("Unknown season status");

  await prisma.season.update({
    where: { id: seasonId },
    data: {
      name,
      status,
      premiereDate: date(formData, "premiereDate"),
      notes: optionalStr(formData, "notes"),
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath("/archive");
  return ok("Season saved");
}

export async function addCastawayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const seasonId = str(formData, "seasonId");
  const name = str(formData, "name");
  if (name.length < 2) return fail("Enter the castaway's name");

  const existing = await prisma.castaway.findFirst({ where: { seasonId, name } });
  if (existing) return fail(`${name} is already in this cast`);

  await prisma.castaway.create({
    data: {
      seasonId,
      name,
      age: int(formData, "age"),
      hometown: optionalStr(formData, "hometown"),
      occupation: optionalStr(formData, "occupation"),
      startingTribe: optionalStr(formData, "startingTribe"),
      photoUrl: optionalStr(formData, "photoUrl"),
      bio: optionalStr(formData, "bio"),
    },
  });

  revalidatePath(`/admin/seasons/${seasonId}`);
  return ok(`${name} added to the cast`);
}

/**
 * Paste-in cast import. One castaway per line, comma or tab separated:
 *
 *   Name, Age, Hometown, Occupation, Starting tribe, Photo URL
 *
 * Only the name is required. This is the fast path for standing up a full
 * 18-20 person cast in a couple of minutes.
 */
export async function importCastAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const seasonId = str(formData, "seasonId");
  const raw = str(formData, "roster");
  if (!raw) return fail("Paste at least one line");

  const existing = await prisma.castaway.findMany({
    where: { seasonId },
    select: { name: true },
  });
  const taken = new Set(existing.map((c) => c.name.toLowerCase()));

  const rows: {
    seasonId: string;
    name: string;
    age: number | null;
    hometown: string | null;
    occupation: string | null;
    startingTribe: string | null;
    photoUrl: string | null;
  }[] = [];

  let skipped = 0;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cells = trimmed.split(trimmed.includes("\t") ? "\t" : ",").map((c) => c.trim());
    const name = cells[0];
    if (!name) continue;

    // Skip a header row and anything already in the cast.
    if (name.toLowerCase() === "name" || taken.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    taken.add(name.toLowerCase());

    const age = Number.parseInt(cells[1] ?? "", 10);

    rows.push({
      seasonId,
      name,
      age: Number.isFinite(age) ? age : null,
      hometown: cells[2] || null,
      occupation: cells[3] || null,
      startingTribe: cells[4] || null,
      photoUrl: cells[5] || null,
    });
  }

  if (rows.length === 0) return fail("No new castaways found in that paste");

  await prisma.castaway.createMany({ data: rows });

  revalidatePath(`/admin/seasons/${seasonId}`);
  return ok(
    `Added ${rows.length} castaway${rows.length === 1 ? "" : "s"}` +
      (skipped ? `, skipped ${skipped} already in the cast` : ""),
  );
}

export async function updateCastawayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const castawayId = str(formData, "castawayId");
  const castaway = await prisma.castaway.findUnique({
    where: { id: castawayId },
    select: { seasonId: true },
  });
  if (!castaway) return fail("That castaway no longer exists");

  const name = str(formData, "name");
  if (name.length < 2) return fail("Enter the castaway's name");

  const status = str(formData, "status") || "active";
  if (!CASTAWAY_STATUSES.includes(status)) return fail("Unknown status");

  await prisma.castaway.update({
    where: { id: castawayId },
    data: {
      name,
      age: int(formData, "age"),
      hometown: optionalStr(formData, "hometown"),
      occupation: optionalStr(formData, "occupation"),
      startingTribe: optionalStr(formData, "startingTribe"),
      photoUrl: optionalStr(formData, "photoUrl"),
      bio: optionalStr(formData, "bio"),
      status,
      finalPlacement: int(formData, "finalPlacement"),
    },
  });

  revalidatePath(`/admin/seasons/${castaway.seasonId}`);
  revalidatePath("/leagues", "layout");
  return ok(`${name} saved`);
}

export async function deleteCastawayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSuperAdmin();

  const castawayId = str(formData, "castawayId");
  const castaway = await prisma.castaway.findUnique({
    where: { id: castawayId },
    select: { seasonId: true, name: true, _count: { select: { picks: true } } },
  });
  if (!castaway) return fail("That castaway no longer exists");

  if (castaway._count.picks > 0) {
    return fail(
      `${castaway.name} has already been drafted in a league. Remove the pick first.`,
    );
  }

  await prisma.castaway.delete({ where: { id: castawayId } });

  revalidatePath(`/admin/seasons/${castaway.seasonId}`);
  return ok(`${castaway.name} removed from the cast`);
}

/**
 * Season-level scoring defaults. New leagues on this season inherit these, and
 * leagues that have not customised their own table follow them live.
 */
export async function updateSeasonScoringRulesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const seasonId = str(formData, "seasonId");

  if (!(await canManageSeasonResults(user, seasonId))) {
    return fail("You cannot edit this season's scoring");
  }

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
        where: { seasonId_eventType: { seasonId, eventType: row.eventType } },
        create: { seasonId, eventType: row.eventType, points: row.points, enabled: row.enabled },
        update: { points: row.points, enabled: row.enabled },
      }),
    ),
  );

  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath("/leagues", "layout");
  return ok("Season scoring defaults saved");
}
