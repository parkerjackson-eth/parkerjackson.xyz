import { notFound } from "next/navigation";

import { CopyField } from "@/components/CopyField";
import {
  DraftOrderForm,
  LeagueSettingsForm,
  MemberRow,
  RegenerateCodeButton,
} from "@/components/LeagueSettings";
import { ScoringRulesForm } from "@/components/ScoringRulesForm";
import { Card, SectionTitle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { toDateTimeLocal } from "@/lib/format";
import { orderedMembers } from "@/lib/draft";
import { resolveRules } from "@/lib/scoring";
import { requireCommissioner } from "@/lib/session";

export const metadata = { title: "League settings" };

export default async function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireCommissioner(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          _count: { select: { picks: true } },
        },
      },
    },
  });
  if (!league) notFound();

  const storedRules = await prisma.scoringRule.findMany({
    where: { OR: [{ seasonId: league.seasonId }, { leagueId }] },
  });
  const rules = resolveRules(storedRules);

  const members = orderedMembers(
    league.members.map((m) => ({
      id: m.id,
      teamName: m.teamName,
      ownerName: m.user.displayName,
      draftPosition: m.draftPosition,
    })),
  );

  const picksMade = league.members.reduce((sum, m) => sum + m._count.picks, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <SectionTitle>League</SectionTitle>
          <LeagueSettingsForm
            leagueId={leagueId}
            name={league.name}
            rosterSize={league.rosterSize}
            draftLockAt={toDateTimeLocal(league.draftLockAt)}
          />
        </Card>

        <Card>
          <SectionTitle>Join code</SectionTitle>
          <p className="mb-3 text-sm text-stone-400">
            Anyone with this code can join the league until the draft locks.
          </p>
          <CopyField value={league.joinCode} />
          <div className="mt-3">
            <RegenerateCodeButton leagueId={leagueId} />
          </div>
        </Card>

        <Card>
          <SectionTitle>Members ({league.members.length})</SectionTitle>
          <div className="space-y-2">
            {members.map((member) => {
              const source = league.members.find((m) => m.id === member.id)!;
              return (
                <MemberRow
                  key={member.id}
                  leagueId={leagueId}
                  memberId={member.id}
                  teamName={member.teamName}
                  ownerName={member.ownerName}
                  email={source.user.email}
                  pickCount={source._count.picks}
                  isCommissioner={source.userId === league.commissionerId}
                />
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Draft order</SectionTitle>
          {picksMade > 0 ? (
            <p className="text-sm text-stone-400">
              The draft has started, so the order is locked. Undo every pick in the draft
              room if you need to reorder.
            </p>
          ) : (
            <DraftOrderForm leagueId={leagueId} members={members} />
          )}
        </Card>
      </div>

      <div>
        <Card>
          <SectionTitle>Scoring</SectionTitle>
          <p className="mb-4 text-sm text-stone-400">
            Change a value and every episode already logged is re-scored — the history of
            what happened is stored separately from what it is worth.
          </p>
          <ScoringRulesForm
            scope="league"
            ownerId={leagueId}
            rules={Object.fromEntries(
              [...rules.values()].map((r) => [
                r.eventType,
                { points: r.points, enabled: r.enabled, source: r.source },
              ]),
            )}
          />
        </Card>
      </div>
    </div>
  );
}
