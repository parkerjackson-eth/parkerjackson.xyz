import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AddCastawayForm,
  CastawayEditor,
  EditSeasonForm,
  ImportCastForm,
} from "@/components/AdminForms";
import { NewEpisodeForm } from "@/components/EpisodeForms";
import { ScoringRulesForm } from "@/components/ScoringRulesForm";
import { AppShell } from "@/components/SiteHeader";
import { Badge, Card, PageHeader, SectionTitle, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, toDateInput } from "@/lib/format";
import { resolveRules } from "@/lib/scoring";
import { requireSuperAdmin } from "@/lib/session";

export const metadata = { title: "Manage season" };

export default async function ManageSeasonPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await requireSuperAdmin();
  const { seasonId } = await params;

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      castaways: {
        orderBy: [{ startingTribe: "asc" }, { name: "asc" }],
        include: { _count: { select: { picks: true } } },
      },
      episodes: {
        orderBy: { number: "desc" },
        include: { _count: { select: { events: true } } },
      },
      leagues: {
        include: {
          commissioner: { select: { displayName: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });
  if (!season) notFound();

  const storedRules = await prisma.scoringRule.findMany({ where: { seasonId } });
  const rules = resolveRules(storedRules);

  const nextEpisodeNumber = (season.episodes[0]?.number ?? 0) + 1;

  return (
    <AppShell>
      <PageHeader
        title={season.name}
        subtitle={
          <>
            {season.status} · premieres {formatDate(season.premiereDate)} ·{" "}
            {season.castaways.length} castaways
          </>
        }
        action={
          <Link href="/admin" className={secondaryButtonClass}>
            Back to admin
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <SectionTitle>Cast ({season.castaways.length})</SectionTitle>
            {season.castaways.length === 0 ? (
              <p className="text-sm text-stone-500">
                No castaways yet. Use the bulk import on the right to add the whole cast at
                once.
              </p>
            ) : (
              <div className="space-y-2">
                {season.castaways.map((castaway) => (
                  <CastawayEditor
                    key={castaway.id}
                    castaway={{
                      id: castaway.id,
                      name: castaway.name,
                      age: castaway.age,
                      hometown: castaway.hometown,
                      occupation: castaway.occupation,
                      startingTribe: castaway.startingTribe,
                      photoUrl: castaway.photoUrl,
                      bio: castaway.bio,
                      status: castaway.status,
                      finalPlacement: castaway.finalPlacement,
                      eliminationEpisode: castaway.eliminationEpisode,
                      pickCount: castaway._count.picks,
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Episodes ({season.episodes.length})</SectionTitle>
            <div className="mb-4 space-y-1">
              {season.episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-stone-900/40"
                >
                  <span className="text-stone-200">
                    Episode {episode.number}
                    {episode.title ? `: ${episode.title}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {formatDate(episode.airDate)} · {episode._count.events} results
                  </span>
                </div>
              ))}
              {season.episodes.length === 0 && (
                <p className="text-sm text-stone-500">No episodes scheduled yet.</p>
              )}
            </div>

            <div className="border-t border-stone-800 pt-4">
              <NewEpisodeForm seasonId={seasonId} nextNumber={nextEpisodeNumber} />
            </div>
          </Card>

          <Card>
            <SectionTitle>Leagues on this season</SectionTitle>
            {season.leagues.length === 0 ? (
              <p className="text-sm text-stone-500">Nobody has started a league yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {season.leagues.map((league) => (
                  <li
                    key={league.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <Link
                      href={`/leagues/${league.id}`}
                      className="font-semibold text-stone-100 hover:text-amber-300"
                    >
                      {league.name}
                    </Link>
                    <span className="text-xs text-stone-500">
                      {league.commissioner.displayName} · {league._count.members} teams
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Bulk import cast</SectionTitle>
            <ImportCastForm seasonId={seasonId} />
          </Card>

          <Card>
            <SectionTitle>Add one castaway</SectionTitle>
            <AddCastawayForm seasonId={seasonId} />
          </Card>

          <Card>
            <SectionTitle>Season details</SectionTitle>
            <EditSeasonForm
              seasonId={seasonId}
              name={season.name}
              status={season.status}
              premiereDate={toDateInput(season.premiereDate)}
              notes={season.notes ?? ""}
            />
          </Card>

          <Card>
            <SectionTitle>Season scoring defaults</SectionTitle>
            <p className="mb-4 text-sm text-stone-400">
              New leagues inherit these. Leagues that have saved their own table are not
              affected.
            </p>
            {season.notes && (
              <p className="mb-4 rounded-lg border border-stone-800 bg-stone-900/50 p-3 text-sm text-stone-300">
                <Badge tone="accent">Twists</Badge> <span className="ml-1">{season.notes}</span>
              </p>
            )}
            <ScoringRulesForm
              scope="season"
              ownerId={seasonId}
              rules={Object.fromEntries(
                [...rules.values()].map((r) => [
                  r.eventType,
                  { points: r.points, enabled: r.enabled, source: r.source },
                ]),
              )}
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
