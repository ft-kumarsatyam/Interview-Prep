import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { ensureToday } from "@/modules/planner/services/plan";
import { CoverageSection } from "@/modules/progress/components/stats/coverage-section";
import { Suspense } from "react";
import { StreakHistorySection } from "@/modules/progress/components/stats/streak-history-section";
import { LearningSection } from "@/modules/progress/components/stats/learning-section";
import { PracticePaceSection } from "@/modules/progress/components/stats/practice-pace-section";
import { QuizMasterySection } from "@/modules/progress/components/stats/quiz-mastery-section";
import { StatsSummary } from "@/modules/progress/components/stats/stats-summary";
import { getStats } from "@/modules/progress/services/stats";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const [stats, today] = await Promise.all([getStats(), ensureToday()]);
  return (
    <>
      <PageHeader title="Stats" icon={BarChart3} description="Are you on pace? Solves, quiz trend, coverage and mastery in one place." />
      <PageStack>
        <StatsSummary stats={stats} streak={today.streak} best={today.best} />
        <Suspense fallback={null}>
          <StreakHistorySection today={today.today} freezeTokens={today.freezeTokens} />
        </Suspense>
        <PracticePaceSection stats={stats} />
        <QuizMasterySection stats={stats} />
        <CoverageSection stats={stats} />
        <Suspense fallback={null}>
          <LearningSection />
        </Suspense>
      </PageStack>
    </>
  );
}
