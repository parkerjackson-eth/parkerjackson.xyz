"use client";

import { useActionState } from "react";

import { joinLeagueAction } from "@/actions/leagues";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass, labelClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

export function JoinLeagueForm({
  defaultCode,
  defaultTeamName,
}: {
  defaultCode: string;
  defaultTeamName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(joinLeagueAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="joinCode" className={labelClass}>
          Join code
        </label>
        <input
          id="joinCode"
          name="joinCode"
          required
          defaultValue={defaultCode}
          maxLength={12}
          autoCapitalize="characters"
          placeholder="ABC123"
          className={`${inputClass} text-center font-mono text-2xl uppercase tracking-[0.4em]`}
        />
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

      <FormMessage state={state} />

      <SubmitButton className="w-full" pendingLabel="Joining…">
        Join league
      </SubmitButton>
    </form>
  );
}
