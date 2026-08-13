import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

/**
 * Episodes and the events inside them belong to the SEASON, not to one league,
 * so two leagues watching the same season share one set of results and can
 * still score them differently through their own scoring tables.
 *
 * That means season results may be entered by the site owner, or by the
 * commissioner of any league playing that season.
 */
export async function canManageSeasonResults(
  user: CurrentUser,
  seasonId: string,
): Promise<boolean> {
  if (user.isSuperAdmin) return true;

  const commissioned = await prisma.league.count({
    where: { seasonId, commissionerId: user.id },
  });

  return commissioned > 0;
}
