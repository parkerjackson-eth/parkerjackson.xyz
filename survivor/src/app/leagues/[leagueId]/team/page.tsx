import { redirect } from "next/navigation";

import { requireLeagueAccess } from "@/lib/session";

export default async function MyTeamRedirect({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const { access } = await requireLeagueAccess(leagueId);

  // Site owners looking at someone else's league have no roster of their own.
  if (!access.membership) redirect(`/leagues/${leagueId}`);

  redirect(`/leagues/${leagueId}/team/${access.membership.id}`);
}
