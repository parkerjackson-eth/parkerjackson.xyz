import { JoinLeagueForm } from "@/components/JoinLeagueForm";
import { AppShell } from "@/components/SiteHeader";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Join a league" };

export default async function JoinLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await requireUser();
  const { code } = await searchParams;

  return (
    <AppShell>
      <PageHeader
        title="Join a league"
        subtitle="Ask your commissioner for the six-character join code."
      />

      <div className="max-w-md">
        <Card>
          <JoinLeagueForm
            defaultCode={code ?? ""}
            defaultTeamName={`${user.displayName}'s team`}
          />
        </Card>
      </div>
    </AppShell>
  );
}
