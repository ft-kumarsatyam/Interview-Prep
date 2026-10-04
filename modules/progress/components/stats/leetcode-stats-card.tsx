import Link from "next/link";
import { ExternalLink, Settings } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";
import type { StatsData } from "@/modules/progress/services/stats";
import { CoverageList, pctOf } from "./coverage-list";

/** LeetCode totals from the public profile, plus how much of the PrepOS list is tracked. */
export function LeetCodeStatsCard({ leetcode: lc }: { leetcode: StatsData["leetcode"] }) {
  return (
    <ChartCard
      title="LeetCode"
      description={lc.username ? `@${lc.username}, public profile` : "Not connected"}
      action={
        lc.username ? (
          <Button asChild variant="ghost" size="sm" className="h-9">
            <a href={`https://leetcode.com/u/${lc.username}/`} target="_blank" rel="noopener noreferrer">
              Profile <ExternalLink />
            </a>
          </Button>
        ) : undefined
      }
    >
      {!lc.username ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Add your username to see your totals and auto-tick solves.</p>
          <Button asChild variant="outline" size="lg" className="h-10 px-4">
            <Link href="/settings">
              <Settings /> Open settings
            </Link>
          </Button>
        </div>
      ) : !lc.stats ? (
        <p className="text-sm text-muted-foreground">LeetCode didn&apos;t answer. Totals will show next time; syncing still works from the dashboard.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Easy", "text-success"],
                ["Medium", "text-warning"],
                ["Hard", "text-destructive"],
              ] as const
            ).map(([d, tone]) => (
              <div key={d} className="rounded-lg bg-muted/50 p-2">
                <p className={cn("text-xs font-medium", tone)}>{d}</p>
                <p className="font-mono text-lg font-semibold tabular-nums">{lc.stats!.solved[d]}</p>
                <p className="text-2xs text-muted-foreground">of {lc.stats!.total[d]}</p>
              </div>
            ))}
          </div>
          <CoverageList
            rows={[
              { key: "lc", label: "All of LeetCode", done: lc.stats.solved.All, total: lc.stats.total.All, pct: pctOf(lc.stats.solved.All, lc.stats.total.All) },
              { key: "prep", label: "PrepOS list (tracked here)", done: lc.trackedSolved, total: lc.trackedTotal, pct: pctOf(lc.trackedSolved, lc.trackedTotal) },
            ]}
          />
        </div>
      )}
    </ChartCard>
  );
}
