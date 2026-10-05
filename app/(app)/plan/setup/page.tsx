import type { Metadata } from "next";
import { Archive, Compass } from "lucide-react";
import { IntakeWizard, type WizardTrack } from "@/modules/planner/components/intake-wizard";
import { PlanHistory, ResetPlannerButton } from "@/modules/planner/components/plan-history";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orderedTopics, trackById, tracks } from "@/core/content";
import { formatDate } from "@/core/plan-clock";
import { rolePathView } from "@/modules/planner/domain/role-path";
import { roles } from "@/modules/planner/lib/roles";
import { getIntake } from "@/modules/planner/services/planner-intake";
import { listSnapshots } from "@/modules/planner/services/planner-snapshot";

export const metadata: Metadata = { title: "Plan setup" };

export default async function PlanSetupPage() {
  const [intake, snapshots] = await Promise.all([getIntake(), listSnapshots()]);
  const byTrack: WizardTrack[] = tracks
    .map((t) => ({ id: t.id, name: trackById.get(t.id)?.name ?? t.id, topics: orderedTopics().filter((x) => x.track === t.id).map((x) => ({ id: x.id, title: x.title, subtopics: x.subtopics.length })) }))
    .filter((t) => t.topics.length > 0);
  const fresh = !intake.completedAt && intake.stepsDone.length === 0;
  return (
    <>
      <PageHeader icon={Compass} title="Plan setup" description="Tell the planner what you're aiming for, where you're strong or weak, and how much time you have. It builds the plan from your answers and tells you honestly if the time isn't enough.">
        {intake.completedAt && <ResetPlannerButton />}
      </PageHeader>
      {fresh && snapshots.length > 0 && (
        <Card className="mx-auto mb-5 max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" aria-hidden /> Go back to a saved plan instead?
            </CardTitle>
            <CardDescription>You have saved plans from the last 60 days. Restore one to skip setup, or carry on below to build a new plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanHistory rows={snapshots.slice(0, 3).map((s) => ({ ...s, takenOnLabel: formatDate(s.takenOn, { day: "numeric", month: "short", year: "numeric" }) }))} />
          </CardContent>
        </Card>
      )}
      <IntakeWizard
        key={intake.completedAt ? intake.completedAt.getTime() : "draft"}
        tracks={byTrack}
        roles={roles.map((r) => ({ id: r.id, title: r.title, blurb: r.blurb, audience: r.audience, path: rolePathView(r) }))}
        initial={{
          goals: intake.goals,
          interviewDate: intake.interviewDate ?? "",
          ratings: intake.ratings.map((r) => ({ topicId: r.topicId, rating: r.rating, wantToLearn: r.wantToLearn, tier: r.tier, diagnosticScore: r.diagnosticScore })),
          hoursByDow: intake.availability.hoursByDow,
          overrides: intake.availability.overrides,
          stepsDone: intake.stepsDone,
          completed: !!intake.completedAt,
        }}
      />
    </>
  );
}
