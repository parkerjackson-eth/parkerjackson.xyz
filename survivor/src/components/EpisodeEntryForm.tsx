"use client";

import { useActionState, useMemo, useState } from "react";

import { saveEpisodeEventsAction } from "@/actions/episodes";
import { FormMessage, SubmitButton } from "@/components/form";
import { Badge, Card, Points, StatusBadge, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EVENT_TYPES,
  type EventCategory,
} from "@/lib/scoring";

type CastawayRow = {
  id: string;
  name: string;
  photoUrl: string | null;
  startingTribe: string | null;
  status: string;
};

type ExistingEvent = {
  castawayId: string;
  eventType: string;
  count: number;
  pointOverride: number | null;
};

type RuleMap = Record<string, { points: number; enabled: boolean }>;

/** castawayId -> eventType -> ticked value */
type Selections = Record<string, Record<string, { count: number; override: number | null }>>;

function buildInitialState(existing: ExistingEvent[]): Selections {
  const state: Selections = {};
  for (const event of existing) {
    state[event.castawayId] ??= {};
    state[event.castawayId][event.eventType] = {
      count: event.count,
      override: event.pointOverride,
    };
  }
  return state;
}

const COMMON_EVENTS = EVENT_TYPES.filter((e) => e.common);

export function EpisodeEntryForm({
  episodeId,
  castaways,
  existing,
  priorEvents,
  rules,
  teamByCastaway,
}: {
  episodeId: string;
  castaways: CastawayRow[];
  existing: ExistingEvent[];
  priorEvents: { castawayId: string; eventType: string }[];
  rules: RuleMap;
  teamByCastaway: Record<string, string>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveEpisodeEventsAction,
    null,
  );
  const [selections, setSelections] = useState<Selections>(() =>
    buildInitialState(existing),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showEliminated, setShowEliminated] = useState(false);
  const [bulkTribe, setBulkTribe] = useState("");

  // Twist rules that are switched off never appear on the form at all.
  const activeEventTypes = useMemo(
    () => EVENT_TYPES.filter((def) => rules[def.key]?.enabled !== false),
    [rules],
  );

  const alreadyScored = useMemo(() => {
    const map = new Set<string>();
    for (const e of priorEvents) map.add(`${e.castawayId}:${e.eventType}`);
    return map;
  }, [priorEvents]);

  const tribes = useMemo(() => {
    const set = new Set<string>();
    for (const c of castaways) if (c.startingTribe) set.add(c.startingTribe);
    return [...set].sort();
  }, [castaways]);

  const visibleCastaways = useMemo(
    () =>
      castaways.filter(
        (c) =>
          showEliminated ||
          c.status !== "eliminated" ||
          selections[c.id] !== undefined,
      ),
    [castaways, showEliminated, selections],
  );

  function toggle(castawayId: string, eventType: string) {
    setSelections((prev) => {
      const next = { ...prev };
      const row = { ...(next[castawayId] ?? {}) };

      if (row[eventType]) {
        delete row[eventType];
      } else {
        row[eventType] = { count: 1, override: null };
      }

      if (Object.keys(row).length === 0) delete next[castawayId];
      else next[castawayId] = row;

      return next;
    });
  }

  function setField(
    castawayId: string,
    eventType: string,
    field: "count" | "override",
    value: number | null,
  ) {
    setSelections((prev) => {
      const row = prev[castawayId];
      if (!row?.[eventType]) return prev;
      return {
        ...prev,
        [castawayId]: {
          ...row,
          [eventType]: { ...row[eventType], [field]: value },
        },
      };
    });
  }

  /** Applies one event to every non-eliminated castaway on a starting tribe. */
  function applyToTribe(eventType: string) {
    if (!bulkTribe) return;
    setSelections((prev) => {
      const next = { ...prev };
      for (const castaway of castaways) {
        if (castaway.startingTribe !== bulkTribe) continue;
        if (castaway.status === "eliminated") continue;
        next[castaway.id] = {
          ...(next[castaway.id] ?? {}),
          [eventType]: next[castaway.id]?.[eventType] ?? { count: 1, override: null },
        };
      }
      return next;
    });
  }

  function pointsFor(eventType: string, entry: { count: number; override: number | null }) {
    const count = Math.max(1, entry.count || 1);
    if (entry.override !== null) return entry.override * count;
    const rule = rules[eventType];
    if (!rule || !rule.enabled) return 0;
    return rule.points * count;
  }

  const castawayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [castawayId, row] of Object.entries(selections)) {
      totals[castawayId] = Object.entries(row).reduce(
        (sum, [eventType, entry]) => sum + pointsFor(eventType, entry),
        0,
      );
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, rules]);

  const teamTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [castawayId, points] of Object.entries(castawayTotals)) {
      const team = teamByCastaway[castawayId];
      if (!team) continue;
      totals[team] = (totals[team] ?? 0) + points;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [castawayTotals, teamByCastaway]);

  const payload = useMemo(
    () =>
      Object.entries(selections).flatMap(([castawayId, row]) =>
        Object.entries(row).map(([eventType, entry]) => ({
          castawayId,
          eventType,
          count: Math.max(1, entry.count || 1),
          pointOverride: entry.override,
          notes: null,
        })),
      ),
    [selections],
  );

  const eventsByCategory = useMemo(() => {
    const map = {} as Record<EventCategory, typeof activeEventTypes>;
    for (const category of CATEGORY_ORDER) {
      map[category] = activeEventTypes.filter((e) => e.category === category);
    }
    return map;
  }, [activeEventTypes]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="episodeId" value={episodeId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {/* Bulk helpers ------------------------------------------------------ */}
      {tribes.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-stone-300">Quick fill:</span>
            <select
              value={bulkTribe}
              onChange={(e) => setBulkTribe(e.target.value)}
              aria-label="Tribe for quick fill"
              className={`${inputClass} w-auto py-1.5`}
            >
              <option value="">Choose a tribe…</option>
              {tribes.map((tribe) => (
                <option key={tribe} value={tribe}>
                  {tribe}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkTribe}
              onClick={() => applyToTribe("TRIBAL_IMMUNITY")}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-stone-200 transition hover:border-stone-500 disabled:opacity-40"
            >
              won immunity
            </button>
            <button
              type="button"
              disabled={!bulkTribe}
              onClick={() => applyToTribe("TRIBAL_REWARD")}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-stone-200 transition hover:border-stone-500 disabled:opacity-40"
            >
              won reward
            </button>
            <span className="text-xs text-stone-500">
              Ticks every castaway still in the game on that starting tribe.
            </span>
          </div>
        </Card>
      )}

      {/* Castaway rows ----------------------------------------------------- */}
      <div className="space-y-2">
        {visibleCastaways.map((castaway) => {
          const row = selections[castaway.id] ?? {};
          const ticked = Object.keys(row);
          const isOpen = expanded[castaway.id] ?? false;
          const total = castawayTotals[castaway.id] ?? 0;
          const team = teamByCastaway[castaway.id];

          return (
            <Card key={castaway.id} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                {castaway.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={castaway.photoUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-800 text-sm font-bold text-stone-500">
                    {castaway.name.slice(0, 1)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{castaway.name}</span>
                    {castaway.status !== "active" && (
                      <StatusBadge status={castaway.status} />
                    )}
                    {team && <Badge tone="accent">{team}</Badge>}
                  </div>
                  {ticked.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {ticked.length} logged
                    </p>
                  )}
                </div>

                <Points value={total} className="text-lg" />
              </div>

              {/* Common events, always visible */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {COMMON_EVENTS.filter(
                  (def) => rules[def.key]?.enabled !== false,
                ).map((def) => (
                  <EventChip
                    key={def.key}
                    label={def.label}
                    points={rules[def.key]?.points ?? def.points}
                    active={!!row[def.key]}
                    warn={def.oncePerSeason && alreadyScored.has(`${castaway.id}:${def.key}`)}
                    onClick={() => toggle(castaway.id, def.key)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [castaway.id]: !isOpen }))
                  }
                  className="rounded-full border border-stone-700 px-3 py-1 text-xs font-medium text-stone-400 transition hover:border-stone-500 hover:text-stone-200"
                >
                  {isOpen ? "Fewer" : "More…"}
                </button>
              </div>

              {/* Everything else */}
              {isOpen && (
                <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
                  {CATEGORY_ORDER.map((category) => {
                    const events = eventsByCategory[category].filter((e) => !e.common);
                    if (events.length === 0) return null;

                    return (
                      <div key={category}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                          {CATEGORY_LABELS[category]}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {events.map((def) => (
                            <EventChip
                              key={def.key}
                              label={def.label}
                              points={rules[def.key]?.points ?? def.points}
                              active={!!row[def.key]}
                              warn={
                                def.oncePerSeason &&
                                alreadyScored.has(`${castaway.id}:${def.key}`)
                              }
                              onClick={() => toggle(castaway.id, def.key)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Per-event detail for what is ticked */}
              {ticked.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-stone-800 pt-3">
                  {ticked.map((eventType) => {
                    const def = EVENT_TYPES.find((e) => e.key === eventType);
                    const entry = row[eventType];

                    return (
                      <div
                        key={eventType}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="flex-1 text-stone-300">
                          {def?.label ?? eventType}
                        </span>

                        {def?.repeatable && (
                          <label className="flex items-center gap-1 text-xs text-stone-500">
                            ×
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={entry.count}
                              onChange={(e) =>
                                setField(
                                  castaway.id,
                                  eventType,
                                  "count",
                                  Number(e.target.value),
                                )
                              }
                              aria-label={`Count for ${def.label}`}
                              className={`${inputClass} w-16 px-2 py-1 text-center`}
                            />
                          </label>
                        )}

                        <label className="flex items-center gap-1 text-xs text-stone-500">
                          override
                          <input
                            type="number"
                            value={entry.override ?? ""}
                            placeholder={String(rules[eventType]?.points ?? def?.points ?? 0)}
                            onChange={(e) =>
                              setField(
                                castaway.id,
                                eventType,
                                "override",
                                e.target.value === "" ? null : Number(e.target.value),
                              )
                            }
                            aria-label={`Point override for ${def?.label ?? eventType}`}
                            className={`${inputClass} w-20 px-2 py-1 text-center`}
                          />
                        </label>

                        <span className="w-12 text-right">
                          <Points value={pointsFor(eventType, entry)} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-400">
        <input
          type="checkbox"
          checked={showEliminated}
          onChange={(e) => setShowEliminated(e.target.checked)}
          className="h-4 w-4 rounded border-stone-600 bg-stone-900 accent-amber-500"
        />
        Show castaways who are already out
      </label>

      {/* Live preview + save ------------------------------------------------ */}
      <div className="sticky bottom-0 -mx-4 border-t border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              This episode
            </p>
            {teamTotals.length === 0 ? (
              <p className="text-sm text-stone-500">Nothing logged yet</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {teamTotals.map(([team, points]) => (
                  <span key={team} className="whitespace-nowrap">
                    <span className="text-stone-400">{team}</span>{" "}
                    <Points value={points} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <SubmitButton pendingLabel="Saving…">
            Save episode ({payload.length})
          </SubmitButton>
        </div>

        <div className="mx-auto mt-2 max-w-6xl">
          <FormMessage state={state} />
        </div>
      </div>
    </form>
  );
}

function EventChip({
  label,
  points,
  active,
  warn,
  onClick,
}: {
  label: string;
  points: number;
  active: boolean;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={warn ? "Already scored in an earlier episode" : undefined}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-amber-500 bg-amber-500/20 text-amber-200"
          : "border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200"
      } ${warn && !active ? "opacity-50" : ""}`}
    >
      {label}
      <span className={`ml-1.5 font-mono ${active ? "text-amber-300" : "text-stone-600"}`}>
        {points > 0 ? "+" : ""}
        {points}
      </span>
    </button>
  );
}
