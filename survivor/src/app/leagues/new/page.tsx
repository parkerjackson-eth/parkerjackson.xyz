import Link from "next/link";

import { CreateLeagueForm } from "@/components/CreateLeagueForm";
import { AppShell } from "@/components/SiteHeader";
import { Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata = { title: "New league" };

export default async function NewLeaguePage() {
  const user = await requireUser();

  const seasons = await prisma.season.findMany({
    where: { status: { in: ["upcoming", "active"] } },
    orderBy: [{ premiereDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { castaways: true } } },
  });

  return (
    <AppShell>
      <PageHeader
        title="Start a league"
        subtitle="You will be the commissioner: you set the scoring, run the draft, and log each episode."
      />

      <div className="max-w-xl">
        {seasons.length === 0 ? (
          <EmptyState
            title="No season is open yet"
            description={
              user.isSuperAdmin
                ? "Create a season and enter its cast first, then come back and start a league on it."
                : "The site owner needs to add a season before leagues can be created. Give them a nudge."
            }
            action={
              user.isSuperAdmin ? (
                <Link href="/admin" className={buttonClass}>
                  Go to admin
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <CreateLeagueForm
              defaultTeamName={`${user.displayName}'s team`}
              seasons={seasons.map((season) => ({
                id: season.id,
                name: season.name,
                castCount: season._count.castaways,
              }))}
            />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
