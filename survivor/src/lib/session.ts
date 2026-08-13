import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
};

/**
 * The signed-in user, read fresh from the database.
 *
 * `cache` de-duplicates this within a single request, so a layout and the page
 * inside it share one query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isSuperAdmin: true,
    },
  });

  return user;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  return user;
}

export type LeagueAccess = {
  league: {
    id: string;
    name: string;
    seasonId: string;
    joinCode: string;
    rosterSize: number;
    draftLockAt: Date | null;
    commissionerId: string;
    season: { id: string; name: string; status: string; premiereDate: Date | null };
  };
  membership: { id: string; teamName: string; draftPosition: number | null } | null;
  isCommissioner: boolean;
  /** Site owners can look at any league, but only commissioners can edit one. */
  isSuperAdmin: boolean;
};

/** Returns null when the league does not exist or the user cannot see it. */
export async function getLeagueAccess(
  leagueId: string,
  user: CurrentUser,
): Promise<LeagueAccess | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      seasonId: true,
      joinCode: true,
      rosterSize: true,
      draftLockAt: true,
      commissionerId: true,
      season: {
        select: { id: true, name: true, status: true, premiereDate: true },
      },
      members: {
        where: { userId: user.id },
        select: { id: true, teamName: true, draftPosition: true },
      },
    },
  });

  if (!league) return null;

  const membership = league.members[0] ?? null;
  const isCommissioner = league.commissionerId === user.id;

  if (!membership && !isCommissioner && !user.isSuperAdmin) return null;

  return {
    league: {
      id: league.id,
      name: league.name,
      seasonId: league.seasonId,
      joinCode: league.joinCode,
      rosterSize: league.rosterSize,
      draftLockAt: league.draftLockAt,
      commissionerId: league.commissionerId,
      season: league.season,
    },
    membership,
    isCommissioner,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function requireLeagueAccess(
  leagueId: string,
): Promise<{ user: CurrentUser; access: LeagueAccess }> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user);
  if (!access) redirect("/dashboard");
  return { user, access };
}

export async function requireCommissioner(
  leagueId: string,
): Promise<{ user: CurrentUser; access: LeagueAccess }> {
  const { user, access } = await requireLeagueAccess(leagueId);
  if (!access.isCommissioner) redirect(`/leagues/${leagueId}`);
  return { user, access };
}
