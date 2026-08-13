"use client";

import { useActionState } from "react";

import { updateTeamNameAction } from "@/actions/leagues";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

export function TeamNameForm({
  memberId,
  teamName,
}: {
  memberId: string;
  teamName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateTeamNameAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="memberId" value={memberId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="teamName"
          defaultValue={teamName}
          required
          minLength={2}
          maxLength={60}
          aria-label="Team name"
          className={`${inputClass} flex-1`}
        />
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
