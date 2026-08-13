import { LeagueNav } from "@/components/LeagueNav";
import { AppShell } from "@/components/SiteHeader";
import { Badge } from "@/components/ui";
import { requireLeagueAccess } from "@/lib/session";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { access } = await requireLeagueAccess(leagueId);

  return (
    <AppShell>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {access.league.name}
          </h1>
          {access.isCommissioner && <Badge tone="accent">Commissioner</Badge>}
          {!access.membership && access.isSuperAdmin && <Badge>Admin view</Badge>}
        </div>
        <p className="mt-1 text-sm text-stone-400">{access.league.season.name}</p>
      </div>

      <LeagueNav leagueId={leagueId} isCommissioner={access.isCommissioner} />

      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
