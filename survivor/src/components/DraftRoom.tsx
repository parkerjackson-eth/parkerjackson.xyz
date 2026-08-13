"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { makePickAction, randomizeDraftOrderAction, undoLastPickAction } from "@/actions/draft";
import { FormMessage, SubmitButton } from "@/components/form";
import { Badge, Card, SectionTitle, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";
import type { DraftMember } from "@/lib/draft";

type Pick = {
  id: string;
  pickNumber: number;
  memberId: string;
  castawayId: string;
  castawayName: string;
  tribe: string | null;
};

type Castaway = {
  id: string;
  name: string;
  age: number | null;
  occupation: string | null;
  hometown: string | null;
  startingTribe: string | null;
  photoUrl: string | null;
};

type State = {
  totalPicks: number;
  picksMade: number;
  complete: boolean;
  locked: boolean;
  onTheClock: DraftMember | null;
  upcoming: { pickNumber: number; member: DraftMember }[];
};

/** Poll interval while waiting on someone else's pick. */
const REFRESH_MS = 12_000;

export function DraftRoom({
  leagueId,
  rosterSize,
  draftLockAt,
  isCommissioner,
  ownMemberId,
  members,
  state,
  picks,
  castaways,
}: {
  leagueId: string;
  rosterSize: number;
  draftLockAt: string | null;
  isCommissioner: boolean;
  ownMemberId: string | null;
  members: DraftMember[];
  state: State;
  picks: Pick[];
  castaways: Castaway[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Castaway | null>(null);

  const [pickState, pickAction] = useActionState<ActionState, FormData>(
    makePickAction,
    null,
  );
  const [undoState, undoAction] = useActionState<ActionState, FormData>(
    undoLastPickAction,
    null,
  );
  const [orderState, orderAction] = useActionState<ActionState, FormData>(
    randomizeDraftOrderAction,
    null,
  );

  const isMyTurn = !!ownMemberId && state.onTheClock?.id === ownMemberId;
  const canPick = !state.locked && !state.complete && (isCommissioner || isMyTurn);
  const draftLive = !state.locked && !state.complete;

  // Poll while someone else is on the clock so the board keeps up without a
  // websocket. Skipped on your own turn so a refresh cannot clear a selection.
  useEffect(() => {
    if (!draftLive || isMyTurn) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [draftLive, isMyTurn, router]);

  // The selected castaway may have just been taken by someone else.
  const takenIds = useMemo(() => new Set(picks.map((p) => p.castawayId)), [picks]);
  useEffect(() => {
    if (selected && takenIds.has(selected.id)) setSelected(null);
  }, [selected, takenIds]);

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return castaways
      .filter((c) => !takenIds.has(c.id))
      .filter(
        (c) =>
          !needle ||
          c.name.toLowerCase().includes(needle) ||
          (c.startingTribe ?? "").toLowerCase().includes(needle) ||
          (c.occupation ?? "").toLowerCase().includes(needle),
      );
  }, [castaways, takenIds, query]);

  const picksByMember = useMemo(() => {
    const map = new Map<string, Pick[]>();
    for (const pick of picks) {
      const list = map.get(pick.memberId) ?? [];
      list.push(pick);
      map.set(pick.memberId, list);
    }
    return map;
  }, [picks]);

  return (
    <div className="space-y-6">
      {/* Status bar -------------------------------------------------------- */}
      <Card
        className={
          state.locked
            ? "border-stone-700"
            : isMyTurn
              ? "border-amber-600/70 bg-amber-950/25"
              : ""
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {state.complete
                ? "Draft complete"
                : state.locked
                  ? "Draft locked"
                  : `Pick ${state.picksMade + 1} of ${state.totalPicks}`}
            </p>
            <p className="mt-1 text-xl font-bold text-white">
              {state.complete
                ? "Every roster is full"
                : state.locked
                  ? "No further picks can be made"
                  : isMyTurn
                    ? "You are on the clock"
                    : `${state.onTheClock?.teamName ?? "Nobody"} is on the clock`}
            </p>
            {!state.complete && !state.locked && state.onTheClock && !isMyTurn && (
              <p className="mt-0.5 text-sm text-stone-400">
                {state.onTheClock.ownerName}
                {draftLockAt ? ` · locks ${new Date(draftLockAt).toLocaleString()}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.upcoming.slice(1, 4).map((slot) => (
              <span
                key={slot.pickNumber}
                className="rounded-lg border border-stone-800 px-2 py-1 text-xs text-stone-400"
              >
                {slot.pickNumber}. {slot.member.teamName}
              </span>
            ))}
          </div>
        </div>

        {isCommissioner && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-800 pt-3">
            <form action={undoAction}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <SubmitButton
                variant="secondary"
                className="text-sm"
                confirm="Undo the most recent pick?"
              >
                Undo last pick
              </SubmitButton>
            </form>
            {state.picksMade === 0 && (
              <form action={orderAction}>
                <input type="hidden" name="leagueId" value={leagueId} />
                <SubmitButton variant="secondary" className="text-sm">
                  Randomize draft order
                </SubmitButton>
              </form>
            )}
            <span className="text-xs text-stone-500">
              As commissioner you can enter the pick for whoever is on the clock.
            </span>
          </div>
        )}

        <div className="mt-3 space-y-2">
          <FormMessage state={pickState} />
          <FormMessage state={undoState} />
          <FormMessage state={orderState} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Available castaways --------------------------------------------- */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <SectionTitle>Available ({available.length})</SectionTitle>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search available castaways"
            className={`${inputClass} mb-3`}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((castaway) => {
              const isSelected = selected?.id === castaway.id;
              return (
                <button
                  key={castaway.id}
                  type="button"
                  disabled={!canPick}
                  onClick={() => setSelected(isSelected ? null : castaway)}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-stone-800 bg-stone-950/50 hover:border-stone-600"
                  } ${canPick ? "" : "cursor-default opacity-70"}`}
                >
                  {castaway.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={castaway.photoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-stone-700"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-800 font-bold text-stone-500">
                      {castaway.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-100">{castaway.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {[castaway.startingTribe, castaway.occupation]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {available.length === 0 && (
            <p className="py-8 text-center text-sm text-stone-500">
              Nobody left matching that search.
            </p>
          )}
        </section>

        {/* Board ------------------------------------------------------------ */}
        <section>
          <SectionTitle>Draft board</SectionTitle>
          <div className="space-y-3">
            {members.map((member) => {
              const theirPicks = picksByMember.get(member.id) ?? [];
              const onClock = state.onTheClock?.id === member.id;

              return (
                <Card
                  key={member.id}
                  className={`p-3 ${onClock ? "border-amber-600/60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-100">
                        {member.teamName}
                      </p>
                      <p className="truncate text-xs text-stone-500">{member.ownerName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {onClock && <Badge tone="accent">On the clock</Badge>}
                      <span className="font-mono text-xs text-stone-500">
                        {theirPicks.length}/{rosterSize}
                      </span>
                    </div>
                  </div>

                  <ol className="mt-2 space-y-1">
                    {Array.from({ length: rosterSize }).map((_, index) => {
                      const pick = theirPicks[index];
                      return (
                        <li
                          key={index}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                            pick ? "bg-stone-900/70" : "border border-dashed border-stone-800"
                          }`}
                        >
                          <span className="w-5 font-mono text-xs text-stone-600">
                            {pick ? pick.pickNumber : "—"}
                          </span>
                          <span
                            className={pick ? "truncate text-stone-200" : "text-stone-600"}
                          >
                            {pick ? pick.castawayName : "Empty"}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky confirm bar ------------------------------------------------- */}
      {selected && canPick && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-amber-800/50 bg-stone-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <form
            action={pickAction}
            onSubmit={() => setSelected(null)}
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"
          >
            <input type="hidden" name="leagueId" value={leagueId} />
            <input type="hidden" name="castawayId" value={selected.id} />
            <input
              type="hidden"
              name="memberId"
              value={state.onTheClock?.id ?? ownMemberId ?? ""}
            />

            <p className="text-sm text-stone-300">
              Drafting <strong className="text-white">{selected.name}</strong> to{" "}
              <strong className="text-white">{state.onTheClock?.teamName}</strong>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <SubmitButton pendingLabel="Drafting…">Confirm pick</SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
