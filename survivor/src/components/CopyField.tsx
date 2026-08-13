"use client";

import { useState } from "react";

import { secondaryButtonClass } from "@/components/ui";

/** Join code with a copy button — the one thing commissioners share constantly. */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the code is on screen either way.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-lg tracking-[0.3em] text-amber-300">
        {value}
      </code>
      <button type="button" onClick={copy} className={`${secondaryButtonClass} text-sm`}>
        {copied ? "Copied" : (label ?? "Copy")}
      </button>
    </div>
  );
}
