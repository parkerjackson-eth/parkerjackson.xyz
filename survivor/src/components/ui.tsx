import Link from "next/link";
import type { ReactNode } from "react";

/* ---------------------------------------------------------------------------
 * Shared class strings. Keeping them here means every form control on the site
 * looks the same without a component wrapper around every input.
 * ------------------------------------------------------------------------ */

export const inputClass =
  "w-full rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-stone-100 " +
  "placeholder:text-stone-500 outline-none transition focus:border-amber-500 " +
  "focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50";

export const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 " +
  "font-semibold text-stone-950 transition hover:bg-amber-400 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 " +
  "bg-stone-900/60 px-4 py-2 font-medium text-stone-200 transition hover:border-stone-500 " +
  "hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/50 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-900/70 " +
  "bg-red-950/40 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-900/40 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-800 bg-stone-950/60 p-5 shadow-xl shadow-black/30 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-stone-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-500/90">
      {children}
    </h2>
  );
}

const badgeTones = {
  active: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  jury: "border-violet-800 bg-violet-950/50 text-violet-300",
  finalist: "border-sky-800 bg-sky-950/50 text-sky-300",
  winner: "border-amber-700 bg-amber-950/60 text-amber-300",
  eliminated: "border-stone-700 bg-stone-900 text-stone-400",
  neutral: "border-stone-700 bg-stone-900 text-stone-300",
  accent: "border-amber-700/70 bg-amber-950/40 text-amber-300",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeTones[tone] ?? badgeTones.neutral}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = (status in badgeTones ? status : "neutral") as BadgeTone;
  return <Badge tone={tone}>{status}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-800 px-6 py-12 text-center">
      <p className="font-semibold text-stone-200">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Points({ value, className = "" }: { value: number; className?: string }) {
  const tone =
    value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-stone-500";
  return (
    <span className={`tabular-nums font-semibold ${tone} ${className}`}>
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

export function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-amber-500/15 text-amber-300"
          : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"
      }`}
    >
      {children}
    </Link>
  );
}
