import { notFound } from "next/navigation";

import { CastHub } from "@/components/CastHub";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getLeagueScoreboard } from "@/lib/scoreboard";
import { requireLeagueAccess } from "@/lib/session";

export const metadata = { title: "Cast" };

export default async function CastPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { access } = await requireLeagueAccess(leagueId);

  const board = await getLeagueScoreboard(leagueId);
  if (!board) notFound();

  const castaways = await prisma.castaway.findMany({
    where: { seasonId: access.league.seasonId },
    orderBy: [{ startingTribe: "asc" }, { name: "asc" }],
  });

  if (castaways.length === 0) {
    return (
      <EmptyState
        title="No cast entered yet"
        description="The site owner needs to add this season's castaways before anyone can draft."
      />
    );
  }

  return (
    <CastHub
      castaways={castaways.map((castaway) => ({
        id: castaway.id,
        name: castaway.name,
        age: castaway.age,
        hometown: castaway.hometown,
        occupation: castaway.occupation,
        startingTribe: castaway.startingTribe,
        photoUrl: castaway.photoUrl,
        bio: castaway.bio,
        status: castaway.status,
        eliminationEpisode: castaway.eliminationEpisode,
        finalPlacement: castaway.finalPlacement,
        points: board.castawayScores.get(castaway.id)?.total ?? 0,
        owner: board.drafted.get(castaway.id)?.teamName ?? null,
      }))}
    />
  );
}
