import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { TestHomeSection } from "@/modules/genai-test/components/home-section";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI tests" };

export default async function GenaiTestHomePage() {
  const today = todayIn(await getSettings());
  return (
    <div className="space-y-8">
      <PageHeader
        icon={ClipboardCheck}
        title="GenAI tests"
        description="A weekly test of MCQs and written answers: this week's topics plus review from earlier weeks. Tests never change your daily plan, streak or daily quiz."
      />
      <Suspense fallback={<PageSkeleton cards={5} label="Loading test coverage…" />}>
        <TestHomeSection today={today} />
      </Suspense>
    </div>
  );
}
