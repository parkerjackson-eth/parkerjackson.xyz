"use client";

import { useMemo, useState } from "react";

import { Badge, Card, StatusBadge, inputClass } from "@/components/ui";

export type CastCardData = {
  id: string;
  name: string;
  age: number | null;
  hometown: string | null;
  occupation: string | null;
  startingTribe: string | null;
  photoUrl: string | null;
  bio: string | null;
  status: string;
  eliminationEpisode: number | null;
  finalPlacement: number | null;
  points: number;
  owner: string | null;
};

const STATUS_FILTERS = ["all", "active", "jury", "finalist", "winner", "eliminated"];

export function CastHub({ castaways }: { castaways: CastCardData[] }) {
  const [tribe, setTribe] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const tribes = useMemo(() => {
    const set = new Set<string>();
    for (const c of castaways) if (c.startingTribe) set.add(c.startingTribe);
    return [...set].sort();
  }, [castaways]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return castaways
      .filter((c) => tribe === "all" || c.startingTribe === tribe)
      .filter((c) => status === "all" || c.status === status)
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          (c.occupation ?? "").toLowerCase().includes(needle) ||
          (c.hometown ?? "").toLowerCase().includes(needle),
      )
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }, [castaways, tribe, status, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the cast…"
            className={inputClass}
            aria-label="Search the cast"
          />
        </div>

        {tribes.length > 0 && (
          <select
            value={tribe}
            onChange={(e) => setTribe(e.target.value)}
            className={`${inputClass} w-auto`}
            aria-label="Filter by tribe"
          >
            <option value="all">All tribes</option>
            {tribes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} w-auto`}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-stone-500">
        Showing {filtered.length} of {castaways.length}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((castaway) => {
          const out = castaway.status === "eliminated";

          return (
            <Card key={castaway.id} className={out ? "opacity-60" : ""}>
              <div className="flex gap-3">
                {castaway.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={castaway.photoUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-800 text-xl font-bold text-stone-500 ring-1 ring-stone-700">
                    {castaway.name.slice(0, 1)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-bold text-white">{castaway.name}</h3>
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-amber-300">
                      {castaway.points}
                    </span>
                  </div>

                  <p className="truncate text-xs text-stone-400">
                    {[
                      castaway.age ? `${castaway.age}` : null,
                      castaway.occupation,
                      castaway.hometown,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No bio details"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {castaway.startingTribe && <Badge>{castaway.startingTribe}</Badge>}
                    <StatusBadge status={castaway.status} />
                    {castaway.owner ? (
                      <Badge tone="accent">{castaway.owner}</Badge>
                    ) : (
                      <Badge>Undrafted</Badge>
                    )}
                  </div>
                </div>
              </div>

              {castaway.bio && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-400">
                  {castaway.bio}
                </p>
              )}

              {(castaway.eliminationEpisode || castaway.finalPlacement) && (
                <p className="mt-3 border-t border-stone-900 pt-2 text-xs text-stone-500">
                  {castaway.finalPlacement ? `Placed ${castaway.finalPlacement}` : null}
                  {castaway.finalPlacement && castaway.eliminationEpisode ? " · " : null}
                  {castaway.eliminationEpisode
                    ? `Out in episode ${castaway.eliminationEpisode}`
                    : null}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-stone-500">
          No castaways match those filters.
        </p>
      )}
    </div>
  );
}
