"use client";

import { usePathname } from "next/navigation";

import { NavLink } from "@/components/ui";

export function LeagueNav({
  leagueId,
  isCommissioner,
}: {
  leagueId: string;
  isCommissioner: boolean;
}) {
  const pathname = usePathname();
  const base = `/leagues/${leagueId}`;

  const links = [
    { href: base, label: "Standings", exact: true },
    { href: `${base}/team`, label: "My team" },
    { href: `${base}/cast`, label: "Cast" },
    { href: `${base}/draft`, label: "Draft room" },
    ...(isCommissioner
      ? [
          { href: `${base}/episodes`, label: "Episodes" },
          { href: `${base}/settings`, label: "Settings" },
        ]
      : []),
  ];

  return (
    <nav className="scroll-x -mx-1 flex gap-1 border-b border-stone-800 pb-2">
      {links.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          active={link.exact ? pathname === link.href : pathname.startsWith(link.href)}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
