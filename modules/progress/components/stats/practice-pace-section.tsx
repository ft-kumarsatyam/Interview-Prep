import Link from "next/link";
import { BarChart3, Code2, TrendingDown, TrendingUp } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSection } from "@/components/shared/page-section";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import type { StatsData } from "@/modules/progress/services/stats";
import { CumulativeChart, DifficultyChart, SolvesPerDayChart } from "./lazy-charts";

/** On-pace curve, problems per day and weekly difficulty mix. */
export function PracticePaceSection({ stats: s }: { stats: StatsData }) {
  const hasSolves = s.totals.solved > 0;
  const last30 = s.perDay.reduce((n, d) => n + d.count, 0);
  const pace = s.cumulative.at(-1);
  const gap = pace ? pace.actual - pace.ideal : 0;
  return (
    <PageSection title="Practice pace">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="On pace?"
          description="Distinct main-track problems against the plan curve."
          action={
            pace && s.cumulative.length > 1 ? (
              <ToneBadge tone={gap >= 0 ? "success" : "danger"} icon={gap >= 0 ? TrendingUp : TrendingDown}>
                {gap === 0 ? "On pace" : gap > 0 ? `${gap} ahead` : `${-gap} behind`}
              </ToneBadge>
            ) : undefined
          }
        >
          {s.cumulative.length > 1 ? (
            <CumulativeChart data={s.cumulative} />
          ) : (
            <EmptyState compact icon={TrendingUp} title="Not started yet">
              The curve starts on the plan&apos;s first day.
            </EmptyState>
          )}
        </ChartCard>

        <ChartCard
          title="Problems per day"
          description="Last 30 days, re-solves included."
          action={hasSolves ? <span className="font-mono text-xs text-muted-foreground tabular-nums">{last30} total</span> : undefined}
        >
          {hasSolves ? (
            <SolvesPerDayChart data={s.perDay} />
          ) : (
            <EmptyState
              compact
              icon={Code2}
              title="No solves yet"
              action={
                <Button asChild size="lg" className="h-10 px-4">
                  <Link href="/dashboard">Today&apos;s problems</Link>
                </Button>
              }
            >
              Solve your first problem to start the chart.
            </EmptyState>
          )}
        </ChartCard>

        <ChartCard title="Difficulty mix" description="New problems per plan week." className="lg:col-span-2">
          {s.difficulty.some((w) => w.Easy + w.Medium + w.Hard > 0) ? (
            <DifficultyChart data={s.difficulty} />
          ) : (
            <EmptyState compact icon={BarChart3} title="Nothing in the plan window yet">
              Weekly difficulty bars appear once you solve inside the plan.
            </EmptyState>
          )}
        </ChartCard>
      </div>
    </PageSection>
  );
}
