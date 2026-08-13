"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { date, fail, int, ok, optionalStr, str, type ActionState } from "@/lib/actions";
import { canManageSeasonResults } from "@/lib/permissions";
import { EVENT_TYPE_MAP } from "@/lib/scoring";
import { requireUser } from "@/lib/session";

const eventSchema = z.object({
  castawayId: z.string().min(1),
  eventType: z.string().min(1),
  count: z.number().int().min(1).max(30),
  pointOverride: z.number().int().min(-100).max(500).nullable(),
  notes: z.string().max(280).nullable(),
});

const payloadSchema = z.array(eventSchema).max(2000);

/**
 * Replaces every event logged against one episode with the submitted set.
 *
 * Save-as-replace keeps the entry screen honest: what you see on the form is
 * exactly what is stored, so re-opening an episode to fix a mistake works the
 * way people expect.
 */
export async function saveEpisodeEventsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const episodeId = str(formData, "episodeId");

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { id: true, seasonId: true, number: true },
  });
  if (!episode) return fail("That episode no longer exists");

  if (!(await canManageSeasonResults(user, episode.seasonId))) {
    return fail("Only the commissioner can enter results");
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(str(formData, "payload") || "[]");
  } catch {
    return fail("Could not read the submitted results");
  }

  const parsed = payloadSchema.safeParse(parsedPayload);
  if (!parsed.success) return fail("Some results were not in the expected format");

  const castaways = await prisma.castaway.findMany({
    where: { seasonId: episode.seasonId },
    select: { id: true },
  });
  const validCastaways = new Set(castaways.map((c) => c.id));

  for (const event of parsed.data) {
    if (!validCastaways.has(event.castawayId)) {
      return fail("A result was logged against someone not in this cast");
    }
    if (!EVENT_TYPE_MAP[event.eventType]) {
      return fail(`Unknown event type: ${event.eventType}`);
    }
  }

  await prisma.$transaction([
    prisma.episodeEvent.deleteMany({ where: { episodeId } }),
    prisma.episodeEvent.createMany({
      data: parsed.data.map((event) => ({
        episodeId,
        castawayId: event.castawayId,
        eventType: event.eventType,
        count: event.count,
        pointOverride: event.pointOverride,
        notes: event.notes,
      })),
    }),
  ]);

  await syncCastawayStatuses(episode.seasonId);

  revalidatePath("/leagues", "layout");
  revalidatePath("/dashboard");
  return ok(`Episode ${episode.number} saved. Standings updated.`);
}

/**
 * Derives each castaway's status from the events logged across the season, so
 * the cast hub and dead roster slots stay correct without extra bookkeeping.
 *
 * Events are the source of truth here: removing a logged elimination puts the
 * castaway back to active.
 */
export async function syncCastawayStatuses(seasonId: string): Promise<void> {
  const [episodes, castaways] = await Promise.all([
    prisma.episode.findMany({
      where: { seasonId },
      orderBy: { number: "asc" },
      include: { events: true },
    }),
    prisma.castaway.findMany({
      where: { seasonId },
      select: { id: true, status: true, eliminationEpisode: true },
    }),
  ]);

  // The merge is wherever REACH_MERGE was first logged. Anyone leaving from
  // that episode on is on the jury.
  const mergeEpisode =
    episodes.find((e) => e.events.some((ev) => ev.eventType === "REACH_MERGE"))?.number ??
    null;

  const derivedStatuses = new Set(["eliminated", "jury", "finalist", "winner"]);
  const updates: { id: string; status: string; eliminationEpisode: number | null }[] = [];

  for (const castaway of castaways) {
    let exitEpisode: number | null = null;
    let isWinner = false;
    let reachedFtc = false;

    for (const episode of episodes) {
      for (const event of episode.events) {
        if (event.castawayId !== castaway.id) continue;
        if (event.eventType === "SOLE_SURVIVOR") isWinner = true;
        if (event.eventType === "REACH_FTC") reachedFtc = true;
        if (
          exitEpisode === null &&
          (event.eventType === "VOTED_OUT" || event.eventType === "QUIT_OR_MEDEVAC")
        ) {
          exitEpisode = episode.number;
        }
      }
    }

    let status: string;
    if (isWinner) {
      status = "winner";
    } else if (reachedFtc) {
      status = "finalist";
    } else if (exitEpisode !== null) {
      status =
        mergeEpisode !== null && exitEpisode >= mergeEpisode ? "jury" : "eliminated";
    } else if (derivedStatuses.has(castaway.status)) {
      // Previously derived, but the event behind it is gone now.
      status = "active";
    } else {
      status = castaway.status;
    }

    if (status !== castaway.status || exitEpisode !== castaway.eliminationEpisode) {
      updates.push({ id: castaway.id, status, eliminationEpisode: exitEpisode });
    }
  }

  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((u) =>
      prisma.castaway.update({
        where: { id: u.id },
        data: { status: u.status, eliminationEpisode: u.eliminationEpisode },
      }),
    ),
  );
}

export async function createEpisodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const seasonId = str(formData, "seasonId");

  if (!(await canManageSeasonResults(user, seasonId))) {
    return fail("You cannot add episodes to this season");
  }

  const number = int(formData, "number");
  if (number === null || number < 1) return fail("Enter an episode number");

  const existing = await prisma.episode.findFirst({ where: { seasonId, number } });
  if (existing) return fail(`Episode ${number} already exists`);

  await prisma.episode.create({
    data: {
      seasonId,
      number,
      title: optionalStr(formData, "title"),
      airDate: date(formData, "airDate"),
      notes: optionalStr(formData, "notes"),
    },
  });

  revalidatePath("/leagues", "layout");
  revalidatePath(`/admin/seasons/${seasonId}`);
  return ok(`Episode ${number} added`);
}

export async function updateEpisodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const episodeId = str(formData, "episodeId");

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { seasonId: true },
  });
  if (!episode) return fail("That episode no longer exists");

  if (!(await canManageSeasonResults(user, episode.seasonId))) {
    return fail("You cannot edit this episode");
  }

  await prisma.episode.update({
    where: { id: episodeId },
    data: {
      title: optionalStr(formData, "title"),
      airDate: date(formData, "airDate"),
      notes: optionalStr(formData, "notes"),
    },
  });

  revalidatePath("/leagues", "layout");
  revalidatePath(`/admin/seasons/${episode.seasonId}`);
  return ok("Episode details saved");
}

export async function deleteEpisodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const episodeId = str(formData, "episodeId");

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { seasonId: true, number: true },
  });
  if (!episode) return fail("That episode no longer exists");

  if (!(await canManageSeasonResults(user, episode.seasonId))) {
    return fail("You cannot delete this episode");
  }

  await prisma.episode.delete({ where: { id: episodeId } });
  await syncCastawayStatuses(episode.seasonId);

  revalidatePath("/leagues", "layout");
  revalidatePath(`/admin/seasons/${episode.seasonId}`);
  return ok(`Episode ${episode.number} deleted`);
}
