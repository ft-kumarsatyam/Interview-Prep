import { Award, CalendarCheck, Code2, Flame, ListChecks, Target } from "lucide-react";
import { StatTile } from "@/components/shared/stat-tile";
import { Progress } from "@/components/ui/progress";
import type { StatsData } from "@/modules/progress/services/stats";
import { pctOf } from "./coverage-list";

type Props = { stats: StatsData; streak: number; best: number };

/** The six headline tiles at the top of /stats. */
export function StatsSummary({ stats: s, streak, best }: Props) {
  const mainPct = pctOf(s.totals.mainSolved, s.totals.mainTotal);
  const last30 = s.perDay.reduce((n, d) => n + d.count, 0);
  const quizAvg = s.quizzes.length ? Math.round(s.quizzes.reduce((n, q) => n + q.pct, 0) / s.quizzes.length) : null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatTile icon={Flame} tone="streak" label="Streak" value={`${streak}d`} hint={`Best ${best}d`} />
      <StatTile icon={Code2} label="Problems solved" value={String(s.totals.solved)} hint={`${last30} in the last 30 days`} />
      <StatTile icon={Target} label="Main track" value={`${mainPct}%`} hint={`${s.totals.mainSolved} of ${s.totals.mainTotal}`}>
        <Progress value={mainPct} className="mt-1" aria-label={`Main track ${mainPct}% done`} />
      </StatTile>
      <StatTile icon={CalendarCheck} tone="success" label="Days complete" value={String(s.totals.daysComplete)} />
      <StatTile icon={ListChecks} label="Quizzes passed" value={String(s.totals.quizzesPassed)} hint={quizAvg === null ? "No quizzes yet" : `Avg best ${quizAvg}%`} />
      <StatTile icon={Award} tone="warning" label="Topics mastered" value={String(s.totals.mastered)} />
    </div>
  );
}
