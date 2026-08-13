import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { AppShell } from "@/components/SiteHeader";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
          Create your account
        </h1>
        <p className="mb-6 text-sm text-stone-400">
          Then start a league, or join one with a code from your commissioner.
        </p>

        <Card>
          <AuthForm mode="signup" />
        </Card>

        <p className="mt-5 text-center text-sm text-stone-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            Log in
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
