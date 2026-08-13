/**
 * Seeds a demo season so you can click through the whole app before the real
 * cast is announced. Safe to run more than once: it skips anything it already
 * created.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

import { EVENT_TYPES } from "../src/lib/scoring";

const prisma = new PrismaClient();

const SEASON_NAME = "Demo Season (sandbox)";

const DEMO_CAST = [
  ["Alina Reyes", 29, "Austin, TX", "Paramedic", "Lulu"],
  ["Bennett Cho", 34, "Seattle, WA", "Software engineer", "Lulu"],
  ["Camille Okafor", 41, "Atlanta, GA", "Attorney", "Lulu"],
  ["Dorian Vance", 26, "Brooklyn, NY", "Bartender", "Lulu"],
  ["Elena Marsh", 38, "Denver, CO", "Ski patrol", "Lulu"],
  ["Felix Duarte", 31, "Miami, FL", "Personal trainer", "Lulu"],
  ["Greta Lindqvist", 45, "Minneapolis, MN", "Farmer", "Nami"],
  ["Hollis Grant", 22, "Nashville, TN", "Student", "Nami"],
  ["Idris Kane", 36, "Phoenix, AZ", "Firefighter", "Nami"],
  ["Jonah Pierce", 52, "Portland, ME", "Lobsterman", "Nami"],
  ["Kiara Sol", 28, "San Diego, CA", "Marine biologist", "Nami"],
  ["Liam Ferrell", 33, "Chicago, IL", "Sales director", "Nami"],
  ["Maya Trent", 47, "Boise, ID", "Nurse practitioner", "Siga"],
  ["Nico Barros", 24, "Houston, TX", "Line cook", "Siga"],
  ["Opal Whitfield", 30, "Charleston, SC", "Real estate agent", "Siga"],
  ["Priya Raman", 39, "Boston, MA", "Surgeon", "Siga"],
  ["Quinn Holloway", 27, "Salt Lake City, UT", "Rock climbing guide", "Siga"],
  ["Rowan Bishop", 44, "Louisville, KY", "High school coach", "Siga"],
] as const;

async function main() {
  let season = await prisma.season.findFirst({ where: { name: SEASON_NAME } });

  if (!season) {
    season = await prisma.season.create({
      data: {
        name: SEASON_NAME,
        status: "active",
        premiereDate: new Date(),
        notes:
          "Sandbox data for trying the app out. Twist rules are switched off — turn them on per season.",
      },
    });
    console.log(`Created season "${season.name}"`);
  } else {
    console.log(`Season "${season.name}" already exists`);
  }

  // Scoring defaults for the season.
  for (const def of EVENT_TYPES) {
    await prisma.scoringRule.upsert({
      where: { seasonId_eventType: { seasonId: season.id, eventType: def.key } },
      create: {
        seasonId: season.id,
        eventType: def.key,
        points: def.points,
        enabled: def.defaultEnabled ?? true,
      },
      update: {},
    });
  }
  console.log(`Ensured ${EVENT_TYPES.length} scoring rules`);

  // Cast.
  let added = 0;
  for (const [name, age, hometown, occupation, startingTribe] of DEMO_CAST) {
    const existing = await prisma.castaway.findFirst({
      where: { seasonId: season.id, name },
    });
    if (existing) continue;

    await prisma.castaway.create({
      data: { seasonId: season.id, name, age, hometown, occupation, startingTribe },
    });
    added++;
  }
  console.log(`Added ${added} castaways (${DEMO_CAST.length} total in the demo cast)`);

  // A few empty episodes so there is something to log against.
  for (let number = 1; number <= 3; number++) {
    const existing = await prisma.episode.findFirst({
      where: { seasonId: season.id, number },
    });
    if (existing) continue;

    await prisma.episode.create({
      data: {
        seasonId: season.id,
        number,
        airDate: new Date(Date.now() + number * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("Ensured episodes 1-3");

  console.log("\nDone. Sign up in the app — the first account becomes site owner.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
