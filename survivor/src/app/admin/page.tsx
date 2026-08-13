import Link from "next/link";

import { NewSeasonForm } from "@/components/AdminForms";
import { AppShell } from "@/components/SiteHeader";
import { Badge, Card, PageHeader, SectionTitle, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, pluralize } from "@/lib/format";
import { requireSuperAdmin } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireSuperAdmin();

  const [seasons, leagues] = await Promise.all([
    prisma.season.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { castaways: true, episodes: true, leagues: true } },
      },
    }),
    prisma.league.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        season: { select: { name: true } },
        commissioner: { select: { displayName: true } },
        _count: { select: { members: true } },
      },
    }),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Site admin"
        subtitle="Create seasons, enter casts, and keep an eye on every league on the site."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section>
            <SectionTitle>Seasons</SectionTitle>
            <div className="space-y-2">
              {seasons.length === 0 && (
                <p className="text-sm text-stone-500">
                  No seasons yet. Create the first one on the right.
                </p>
              )}

              {seasons.map((season) => (
                <Card key={season.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">{season.name}</h3>
                        <Badge tone={season.status === "active" ? "active" : "neutral"}>
                          {season.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Premieres {formatDate(season.premiereDate)} ·{" "}
                        {pluralize(season._count.castaways, "castaway")} ·{" "}
                        {pluralize(season._count.episodes, "episode")} ·{" "}
                        {pluralize(season._count.leagues, "league")}
                      </p>
                    </div>

                    <Link
                      href={`/admin/seasons/${season.id}`}
                      className={`${secondaryButtonClass} text-sm`}
                    >
                      Manage
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>All leagues ({leagues.length})</SectionTitle>
            {leagues.length === 0 ? (
              <p className="text-sm text-stone-500">No leagues have been created yet.</p>
            ) : (
              <Card className="p-0">
                <div className="scroll-x">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-stone-800 text-left text-[11px] uppercase tracking-wider text-stone-500">
                        <th className="px-4 py-3 font-semibold">League</th>
                        <th className="px-2 py-3 font-semibold">Season</th>
                        <th className="px-2 py-3 font-semibold">Commissioner</th>
                        <th className="px-4 py-3 text-right font-semibold">Teams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagues.map((league) => (
                        <tr
                          key={league.id}
                          className="border-b border-stone-900 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/leagues/${league.id}`}
                              className="font-semibold text-stone-100 hover:text-amber-300"
                            >
                              {league.name}
                            </Link>
                          </td>
                          <td className="px-2 py-3 text-stone-400">{league.season.name}</td>
                          <td className="px-2 py-3 text-stone-400">
                            {league.commissioner.displayName}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-stone-300">
                            {league._count.members}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </div>

        <div>
          <SectionTitle>New season</SectionTitle>
          <Card>
            <NewSeasonForm />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
