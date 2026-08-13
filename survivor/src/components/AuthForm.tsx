"use client";

import { useActionState } from "react";

import { signInAction, signUpAction } from "@/actions/auth";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass, labelClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "signup" ? signUpAction : signInAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            autoComplete="name"
            placeholder="Parker"
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          className={inputClass}
        />
      </div>

      <FormMessage state={state} />

      <SubmitButton className="w-full" pendingLabel="One moment…">
        {mode === "signup" ? "Create account" : "Log in"}
      </SubmitButton>
    </form>
  );
}
