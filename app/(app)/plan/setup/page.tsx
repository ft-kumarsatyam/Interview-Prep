import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { IntakeWizard, type WizardTrack } from "@/components/planner/intake-wizard";
import { PageHeader } from "@/components/shared/page-header";
import { orderedTopics, trackById, tracks } from "@/lib/content";
import { getIntake } from "@/lib/services/planner-intake";

export const metadata: Metadata = { title: "Plan setup" };

export default async function PlanSetupPage() {
  const intake = await getIntake();
  const byTrack: WizardTrack[] = tracks
    .map((t) => ({ id: t.id, name: trackById.get(t.id)?.name ?? t.id, topics: orderedTopics().filter((x) => x.track === t.id).map((x) => ({ id: x.id, title: x.title, subtopics: x.subtopics.length })) }))
    .filter((t) => t.topics.length > 0);
  return (
    <>
      <PageHeader icon={Compass} title="Plan setup" description="Tell the planner what you want, where you are strong or weak, and how much time you have. It builds the plan from your answers and tells you honestly if the time isn't enough." />
      <IntakeWizard
        tracks={byTrack}
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
