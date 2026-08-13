"use client";

import { useActionState, useState } from "react";

import { createLeagueAction } from "@/actions/leagues";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass, labelClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

type SeasonOption = { id: string; name: string; castCount: number };

export function CreateLeagueForm({
  seasons,
  defaultTeamName,
}: {
  seasons: SeasonOption[];
  defaultTeamName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLeagueAction,
    null,
  );
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [rosterSize, setRosterSize] = useState(3);

  const season = seasons.find((s) => s.id === seasonId);
  const castCount = season?.castCount ?? 0;
  // How many teams the cast supports at this roster size — the guidance most
  // commissioners actually want before they pick a number.
  const teamsSupported = rosterSize > 0 ? Math.floor(castCount / rosterSize) : 0;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          League name
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={3}
          placeholder="Thursday Night Tribal"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="seasonId" className={labelClass}>
          Season
        </label>
        <select
          id="seasonId"
          name="seasonId"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className={inputClass}
        >
          {seasons.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.castCount} castaways)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="teamName" className={labelClass}>
          Your team name
        </label>
        <input
          id="teamName"
          name="teamName"
          defaultValue={defaultTeamName}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="rosterSize" className={labelClass}>
          Castaways per team
        </label>
        <input
          id="rosterSize"
          name="rosterSize"
          type="number"
          min={1}
          max={10}
          value={rosterSize}
          onChange={(e) => setRosterSize(Number(e.target.value))}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          {castCount > 0 ? (
            <>
              {castCount} castaways at {rosterSize} each supports up to{" "}
              <strong className="text-stone-300">{teamsSupported} teams</strong>, leaving{" "}
              {castCount - teamsSupported * rosterSize} undrafted. Leaving a few undrafted
              is better than forcing an odd split.
            </>
          ) : (
            "This season has no cast entered yet."
          )}
        </p>
      </div>

      <div>
        <label htmlFor="draftLockAt" className={labelClass}>
          Draft lock (optional)
        </label>
        <input
          id="draftLockAt"
          name="draftLockAt"
          type="datetime-local"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          No picks can be made after this time. Set it to just before the premiere.
        </p>
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full" pendingLabel="Creating…">
        Create league
      </SubmitButton>
    </form>
  );
}
