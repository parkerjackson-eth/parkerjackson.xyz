"use client";

import { useActionState } from "react";

import { updateSeasonScoringRulesAction } from "@/actions/admin";
import { resetScoringRulesAction, updateScoringRulesAction } from "@/actions/leagues";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";
import { CATEGORY_LABELS, CATEGORY_ORDER, EVENT_TYPES } from "@/lib/scoring";

export type RuleValue = { points: number; enabled: boolean; source: string };

/**
 * One editor used in two places: a league's own scoring table, and a season's
 * defaults in admin. `scope` picks which action it posts to.
 */
export function ScoringRulesForm({
  scope,
  ownerId,
  rules,
}: {
  scope: "league" | "season";
  ownerId: string;
  rules: Record<string, RuleValue>;
}) {
  const action =
    scope === "league" ? updateScoringRulesAction : updateSeasonScoringRulesAction;

  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  const [resetState, resetAction] = useActionState<ActionState, FormData>(
    resetScoringRulesAction,
    null,
  );

  const idField = scope === "league" ? "leagueId" : "seasonId";

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name={idField} value={ownerId} />

        {CATEGORY_ORDER.map((category) => {
          const events = EVENT_TYPES.filter((e) => e.category === category);
          if (events.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-500/90">
                {CATEGORY_LABELS[category]}
              </h3>

              <div className="space-y-1">
                {events.map((def) => {
                  const rule = rules[def.key] ?? {
                    points: def.points,
                    enabled: def.defaultEnabled ?? true,
                    source: "default",
                  };

                  return (
                    <div
                      key={def.key}
                      className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 odd:bg-stone-900/40"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`enabled:${def.key}`}
                          defaultChecked={rule.enabled}
                          className="h-4 w-4 rounded border-stone-600 bg-stone-900 accent-amber-500"
                          aria-label={`Enable ${def.label}`}
                        />
                        <span className="sr-only">Enable {def.label}</span>
                      </label>

                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={`points:${def.key}`}
                          className="block text-sm text-stone-200"
                        >
                          {def.label}
                          {def.repeatable && (
                            <span className="text-stone-500"> (each)</span>
                          )}
                        </label>
                        {def.hint && (
                          <p className="text-xs text-stone-500">{def.hint}</p>
                        )}
                      </div>

                      <input
                        id={`points:${def.key}`}
                        name={`points:${def.key}`}
                        type="number"
                        min={-100}
                        max={500}
                        defaultValue={rule.points}
                        className={`${inputClass} w-20 px-2 py-1 text-center`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <FormMessage state={state} />

        <SubmitButton pendingLabel="Saving…">
          {scope === "league" ? "Save league scoring" : "Save season defaults"}
        </SubmitButton>
      </form>

      {scope === "league" && (
        <form action={resetAction} className="border-t border-stone-800 pt-4">
          <input type="hidden" name="leagueId" value={ownerId} />
          <FormMessage state={resetState} />
          <SubmitButton
            variant="secondary"
            className="text-sm"
            confirm="Drop this league's custom scoring and follow the season defaults?"
          >
            Reset to season defaults
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
