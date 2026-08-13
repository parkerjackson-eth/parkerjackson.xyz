import Link from "next/link";

import { NewEpisodeForm } from "@/components/EpisodeForms";
import { Badge, Card, EmptyState, SectionTitle, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireCommissioner } from "@/lib/session";

export const metadata = { title: "Episodes" };

export default async function EpisodesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { access } = await requireCommissioner(leagueId);

  const episodes = await prisma.episode.findMany({
    where: { seasonId: access.league.seasonId },
    orderBy: { number: "desc" },
    include: { _count: { select: { events: true } } },
  });

  const nextNumber = (episodes[0]?.number ?? 0) + 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <SectionTitle>Episodes</SectionTitle>

        {episodes.length === 0 ? (
          <EmptyState
            title="No episodes yet"
            description="Add episode 1 to start logging results."
          />
        ) : (
          <div className="space-y-2">
            {episodes.map((episode) => (
              <Card key={episode.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">
                        Episode {episode.number}
                        {episode.title ? `: ${episode.title}` : ""}
                      </h3>
                      {episode._count.events > 0 ? (
                        <Badge tone="active">{episode._count.events} results</Badge>
                      ) : (
                        <Badge>Not logged</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Aired {formatDate(episode.airDate)}
                    </p>
                  </div>

                  <Link
                    href={`/leagues/${leagueId}/episodes/${episode.id}`}
                    className={`${secondaryButtonClass} text-sm`}
                  >
                    {episode._count.events > 0 ? "Edit results" : "Log results"}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Add an episode</SectionTitle>
        <Card>
          <NewEpisodeForm seasonId={access.league.seasonId} nextNumber={nextNumber} />
        </Card>

        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Episodes belong to the season, so every league watching {access.league.season.name}{" "}
          shares the same results. Each league still scores them with its own scoring table.
        </p>
      </section>
    </div>
  );
}
