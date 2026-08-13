import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { AppShell } from "@/components/SiteHeader";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mb-6 text-sm text-stone-400">
          Log in to check your roster and the standings.
        </p>

        <Card>
          <AuthForm mode="login" />
        </Card>

        <p className="mt-5 text-center text-sm text-stone-400">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-amber-400 hover:text-amber-300">
            Create an account
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
