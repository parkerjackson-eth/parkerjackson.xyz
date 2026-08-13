"use client";

import { useFormStatus } from "react-dom";

import { buttonClass, secondaryButtonClass, dangerButtonClass } from "@/components/ui";
import type { ActionState } from "@/lib/actions";

const variants = {
  primary: buttonClass,
  secondary: secondaryButtonClass,
  danger: dangerButtonClass,
};

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof variants;
  className?: string;
  /** Browser confirm() prompt shown before the form submits. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`${variants[variant]} ${className}`}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;

  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-300"
      >
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-lg border border-emerald-900/70 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300"
      >
        {state.success}
      </p>
    );
  }

  return null;
}
