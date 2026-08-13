"use client";

import { useActionState } from "react";

import {
  createEpisodeAction,
  deleteEpisodeAction,
  updateEpisodeAction,
} from "@/actions/episodes";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass, labelClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

export function NewEpisodeForm({
  seasonId,
  nextNumber,
}: {
  seasonId: string;
  nextNumber: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEpisodeAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="seasonId" value={seasonId} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="number" className={labelClass}>
            Number
          </label>
          <input
            id="number"
            name="number"
            type="number"
            min={1}
            required
            defaultValue={nextNumber}
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="airDate" className={labelClass}>
            Air date
          </label>
          <input id="airDate" name="airDate" type="date" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="title" className={labelClass}>
          Title (optional)
        </label>
        <input id="title" name="title" placeholder="Episode title" className={inputClass} />
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full" pendingLabel="Adding…">
        Add episode
      </SubmitButton>
    </form>
  );
}

export function EditEpisodeForm({
  episodeId,
  title,
  airDate,
  notes,
  redirectAfterDelete,
}: {
  episodeId: string;
  title: string;
  airDate: string;
  notes: string;
  redirectAfterDelete: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateEpisodeAction,
    null,
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteEpisodeAction,
    null,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="episodeId" value={episodeId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-title" className={labelClass}>
              Title
            </label>
            <input
              id="ep-title"
              name="title"
              defaultValue={title}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ep-airDate" className={labelClass}>
              Air date
            </label>
            <input
              id="ep-airDate"
              name="airDate"
              type="date"
              defaultValue={airDate}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ep-notes" className={labelClass}>
            Recap note
          </label>
          <textarea
            id="ep-notes"
            name="notes"
            rows={2}
            defaultValue={notes}
            placeholder="One line for the league home page"
            className={inputClass}
          />
        </div>

        <FormMessage state={state} />

        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save episode details
        </SubmitButton>
      </form>

      <form action={deleteAction} className="border-t border-stone-800 pt-3">
        <input type="hidden" name="episodeId" value={episodeId} />
        <input type="hidden" name="redirectTo" value={redirectAfterDelete} />
        <FormMessage state={deleteState} />
        <SubmitButton
          variant="danger"
          confirm="Delete this episode and every result logged in it?"
        >
          Delete episode
        </SubmitButton>
      </form>
    </div>
  );
}
