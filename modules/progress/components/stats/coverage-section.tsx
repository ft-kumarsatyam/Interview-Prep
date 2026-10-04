import { ChartCard } from "@/components/shared/chart-card";
import { PageSection } from "@/components/shared/page-section";
import type { StatsData } from "@/modules/progress/services/stats";
import { CoverageList } from "./coverage-list";
import { LeetCodeStatsCard } from "./leetcode-stats-card";

/** Problem-track and syllabus coverage plus the LeetCode card. */
export function CoverageSection({ stats: s }: { stats: StatsData }) {
  return (
    <PageSection title="Coverage">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Problem tracks" description="Solved out of each list.">
          <CoverageList rows={s.problemTracks} />
        </ChartCard>
        <ChartCard title="Syllabus coverage" description="Subtopics ticked per track.">
          <CoverageList rows={s.syllabusTracks} />
        </ChartCard>
        <LeetCodeStatsCard leetcode={s.leetcode} />
      </div>
    </PageSection>
  );
}
