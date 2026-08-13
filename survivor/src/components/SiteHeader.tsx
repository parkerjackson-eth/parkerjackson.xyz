import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/form";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-stone-800/80 bg-stone-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="group flex items-center gap-2">
          <span aria-hidden className="text-xl">
            🔥
          </span>
          <span className="font-bold tracking-tight text-white transition group-hover:text-amber-300">
            Survivor Fantasy
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
              >
                Leagues
              </Link>
              <Link
                href="/archive"
                className="rounded-lg px-3 py-1.5 text-stone-400 transition hover:bg-stone-900 hover:text-stone-100"
              >
                Archive
              </Link>
              {user.isSuperAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-1.5 text-amber-400/90 transition hover:bg-stone-900 hover:text-amber-300"
                >
                  Admin
                </Link>
              )}
              <form action={signOutAction} className="ml-1">
                <SubmitButton variant="secondary" className="px-3 py-1.5 text-sm">
                  Sign out
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-stone-300 transition hover:bg-stone-900 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-stone-950 transition hover:bg-amber-400"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-stone-900 px-4 py-6 text-center text-xs text-stone-600">
        A private fantasy league for friends. Not affiliated with or endorsed by CBS or
        Survivor Productions.
      </footer>
    </div>
  );
}
