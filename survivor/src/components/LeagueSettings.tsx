"use client";

import { useActionState } from "react";

import { randomizeDraftOrderAction, setDraftOrderAction } from "@/actions/draft";
import {
  regenerateJoinCodeAction,
  removeMemberAction,
  updateLeagueSettingsAction,
} from "@/actions/leagues";
import { FormMessage, SubmitButton } from "@/components/form";
import { Badge, inputClass, labelClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";
import type { DraftMember } from "@/lib/draft";

export function LeagueSettingsForm({
  leagueId,
  name,
  rosterSize,
  draftLockAt,
}: {
  leagueId: string;
  name: string;
  rosterSize: number;
  draftLockAt: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateLeagueSettingsAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="leagueId" value={leagueId} />

      <div>
        <label htmlFor="league-name" className={labelClass}>
          League name
        </label>
        <input
          id="league-name"
          name="name"
          defaultValue={name}
          required
          minLength={3}
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
            defaultValue={rosterSize}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="draftLockAt" className={labelClass}>
            Draft lock
          </label>
          <input
            id="draftLockAt"
            name="draftLockAt"
            type="datetime-local"
            defaultValue={draftLockAt}
            className={inputClass}
          />
        </div>
      </div>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
    </form>
  );
}

export function RegenerateCodeButton({ leagueId }: { leagueId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    regenerateJoinCodeAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leagueId" value={leagueId} />
      <FormMessage state={state} />
      <SubmitButton
        variant="secondary"
        className="text-sm"
        confirm="Generate a new code? The old one stops working immediately."
      >
        Generate a new code
      </SubmitButton>
    </form>
  );
}

export function MemberRow({
  leagueId,
  memberId,
  teamName,
  ownerName,
  email,
  pickCount,
  isCommissioner,
}: {
  leagueId: string;
  memberId: string;
  teamName: string;
  ownerName: string;
  email: string;
  pickCount: number;
  isCommissioner: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    removeMemberAction,
    null,
  );

  return (
    <div className="rounded-xl border border-stone-800 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-stone-100">{teamName}</span>
            {isCommissioner && <Badge tone="accent">Commissioner</Badge>}
          </div>
          <p className="truncate text-xs text-stone-500">
            {ownerName} · {email} · {pickCount} pick{pickCount === 1 ? "" : "s"}
          </p>
        </div>

        {!isCommissioner && (
          <form action={formAction}>
            <input type="hidden" name="leagueId" value={leagueId} />
            <input type="hidden" name="memberId" value={memberId} />
            <SubmitButton
              variant="danger"
              confirm={`Remove ${teamName} from the league? Their draft picks are released back into the pool.`}
            >
              Remove
            </SubmitButton>
          </form>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}

export function DraftOrderForm({
  leagueId,
  members,
}: {
  leagueId: string;
  members: DraftMember[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setDraftOrderAction,
    null,
  );
  const [randomState, randomAction] = useActionState<ActionState, FormData>(
    randomizeDraftOrderAction,
    null,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-400">
        Round one runs in this order, round two runs backwards, and so on.
      </p>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="leagueId" value={leagueId} />

        {members.map((member, index) => (
          <div key={member.id} className="flex items-center gap-3">
            <input
              type="number"
              name={`position:${member.id}`}
              min={1}
              max={members.length}
              defaultValue={member.draftPosition ?? index + 1}
              aria-label={`Draft position for ${member.teamName}`}
              className={`${inputClass} w-16 px-2 py-1 text-center`}
            />
            <span className="min-w-0 truncate text-sm text-stone-200">
              {member.teamName}
              <span className="text-stone-500"> · {member.ownerName}</span>
            </span>
          </div>
        ))}

        <FormMessage state={state} />
        <SubmitButton variant="secondary" className="text-sm" pendingLabel="Saving…">
          Save order
        </SubmitButton>
      </form>

      <form action={randomAction} className="border-t border-stone-800 pt-3">
        <input type="hidden" name="leagueId" value={leagueId} />
        <FormMessage state={randomState} />
        <SubmitButton variant="secondary" className="text-sm">
          Randomize
        </SubmitButton>
      </form>
    </div>
  );
}
