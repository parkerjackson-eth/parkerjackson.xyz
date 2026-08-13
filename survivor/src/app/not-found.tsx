import Link from "next/link";

import { AppShell } from "@/components/SiteHeader";
import { EmptyState, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <AppShell>
      <EmptyState
        title="Voted out"
        description="That page does not exist, or you do not have access to it."
        action={
          <Link href="/dashboard" className={buttonClass}>
            Back to your leagues
          </Link>
        }
      />
    </AppShell>
  );
}
