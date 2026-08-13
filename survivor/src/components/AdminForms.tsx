"use client";

import { useActionState, useState } from "react";

import {
  addCastawayAction,
  createSeasonAction,
  deleteCastawayAction,
  importCastAction,
  updateCastawayAction,
  updateSeasonAction,
} from "@/actions/admin";
import { FormMessage, SubmitButton } from "@/components/form";
import { StatusBadge, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

const SEASON_STATUSES = ["upcoming", "active", "completed"];
const CASTAWAY_STATUSES = ["active", "jury", "finalist", "winner", "eliminated"];

export function NewSeasonForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createSeasonAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="season-name" className={labelClass}>
          Season name
        </label>
        <input
          id="season-name"
          name="name"
          required
          placeholder="Survivor 50"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="season-premiere" className={labelClass}>
            Premiere date
          </label>
          <input
            id="season-premiere"
            name="premiereDate"
            type="date"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="season-status" className={labelClass}>
            Status
          </label>
          <select id="season-status" name="status" className={inputClass}>
            {SEASON_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="season-notes" className={labelClass}>
          Twists and notes
        </label>
        <textarea
          id="season-notes"
          name="notes"
          rows={3}
          placeholder="Edge of Extinction, final three fire making…"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          Note which twists are in play so commissioners know which twist scoring rules to
          switch on.
        </p>
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full" pendingLabel="Creating…">
        Create season
      </SubmitButton>
    </form>
  );
}

export function EditSeasonForm({
  seasonId,
  name,
  status,
  premiereDate,
  notes,
}: {
  seasonId: string;
  name: string;
  status: string;
  premiereDate: string;
  notes: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateSeasonAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="seasonId" value={seasonId} />

      <div>
        <label htmlFor="edit-season-name" className={labelClass}>
          Season name
        </label>
        <input
          id="edit-season-name"
          name="name"
          defaultValue={name}
          required
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-season-premiere" className={labelClass}>
            Premiere date
          </label>
          <input
            id="edit-season-premiere"
            name="premiereDate"
            type="date"
            defaultValue={premiereDate}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="edit-season-status" className={labelClass}>
            Status
          </label>
          <select
            id="edit-season-status"
            name="status"
            defaultValue={status}
            className={inputClass}
          >
            {SEASON_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="edit-season-notes" className={labelClass}>
          Twists and notes
        </label>
        <textarea
          id="edit-season-notes"
          name="notes"
          rows={3}
          defaultValue={notes}
          className={inputClass}
        />
      </div>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Saving…">Save season</SubmitButton>
    </form>
  );
}

export function ImportCastForm({ seasonId }: { seasonId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(importCastAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="seasonId" value={seasonId} />

      <div>
        <label htmlFor="roster" className={labelClass}>
          Paste the cast
        </label>
        <textarea
          id="roster"
          name="roster"
          rows={8}
          required
          spellCheck={false}
          placeholder={
            "Name, Age, Hometown, Occupation, Starting tribe, Photo URL\n" +
            "Parvati Shallow, 41, Atlanta GA, Boxing coach, Malakal\n" +
            "Cirie Fields, 54, Jersey City NJ, Nurse, Airai"
          }
          className={`${inputClass} font-mono text-xs`}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          One castaway per line, comma or tab separated. Only the name is required, so you
          can paste straight out of a spreadsheet. A header row is skipped, and anyone
          already in the cast is left alone.
        </p>
      </div>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Importing…">Import cast</SubmitButton>
    </form>
  );
}

export function AddCastawayForm({ seasonId }: { seasonId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addCastawayAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="seasonId" value={seasonId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cast-name" className={labelClass}>
            Name
          </label>
          <input id="cast-name" name="name" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="cast-tribe" className={labelClass}>
            Starting tribe
          </label>
          <input id="cast-tribe" name="startingTribe" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cast-age" className={labelClass}>
            Age
          </label>
          <input id="cast-age" name="age" type="number" min={1} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cast-hometown" className={labelClass}>
            Hometown
          </label>
          <input id="cast-hometown" name="hometown" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cast-occupation" className={labelClass}>
            Occupation
          </label>
          <input id="cast-occupation" name="occupation" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cast-photo" className={labelClass}>
            Photo URL
          </label>
          <input
            id="cast-photo"
            name="photoUrl"
            type="url"
            placeholder="https://…"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cast-bio" className={labelClass}>
            Short bio
          </label>
          <textarea id="cast-bio" name="bio" rows={2} className={inputClass} />
        </div>
      </div>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Adding…">Add castaway</SubmitButton>
    </form>
  );
}

export type EditableCastaway = {
  id: string;
  name: string;
  age: number | null;
  hometown: string | null;
  occupation: string | null;
  startingTribe: string | null;
  photoUrl: string | null;
  bio: string | null;
  status: string;
  finalPlacement: number | null;
  eliminationEpisode: number | null;
  pickCount: number;
};

export function CastawayEditor({ castaway }: { castaway: EditableCastaway }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateCastawayAction,
    null,
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteCastawayAction,
    null,
  );

  return (
    <div className="rounded-xl border border-stone-800 p-3">
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
            <span className="font-semibold text-stone-100">{castaway.name}</span>
            <StatusBadge status={castaway.status} />
          </div>
          <p className="truncate text-xs text-stone-500">
            {[castaway.startingTribe, castaway.occupation, castaway.hometown]
              .filter(Boolean)
              .join(" · ") || "No details"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="castawayId" value={castaway.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" name="name" defaultValue={castaway.name} required />
              <Field
                label="Starting tribe"
                name="startingTribe"
                defaultValue={castaway.startingTribe ?? ""}
              />
              <Field
                label="Age"
                name="age"
                type="number"
                defaultValue={castaway.age?.toString() ?? ""}
              />
              <Field
                label="Hometown"
                name="hometown"
                defaultValue={castaway.hometown ?? ""}
              />
              <Field
                label="Occupation"
                name="occupation"
                defaultValue={castaway.occupation ?? ""}
                className="sm:col-span-2"
              />
              <Field
                label="Photo URL"
                name="photoUrl"
                defaultValue={castaway.photoUrl ?? ""}
                className="sm:col-span-2"
              />

              <div>
                <label className={labelClass}>Status</label>
                <select
                  name="status"
                  defaultValue={castaway.status}
                  className={inputClass}
                >
                  {CASTAWAY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="Final placement"
                name="finalPlacement"
                type="number"
                defaultValue={castaway.finalPlacement?.toString() ?? ""}
              />

              <div className="sm:col-span-2">
                <label className={labelClass}>Short bio</label>
                <textarea
                  name="bio"
                  rows={2}
                  defaultValue={castaway.bio ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-stone-500">
              Status and elimination episode are set automatically when a vote-out is
              logged, so anything you set here is overwritten the next time an episode is
              saved.
            </p>

            <FormMessage state={state} />
            <SubmitButton variant="secondary" className="text-sm" pendingLabel="Saving…">
              Save castaway
            </SubmitButton>
          </form>

          <form action={deleteAction} className="border-t border-stone-800 pt-3">
            <input type="hidden" name="castawayId" value={castaway.id} />
            <FormMessage state={deleteState} />
            <SubmitButton
              variant="danger"
              confirm={`Remove ${castaway.name} from the cast?`}
            >
              Delete castaway
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className={inputClass}
      />
    </div>
  );
}
