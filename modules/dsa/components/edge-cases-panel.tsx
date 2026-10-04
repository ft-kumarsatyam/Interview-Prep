import { Flag, Play } from "lucide-react";
import type { ProblemTestCase } from "@/core/content";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { edgeInfo } from "@/modules/dsa/domain/edge-cases";
import type { CaseResult } from "@/core/sandbox/run";
import { cn } from "@/core/utils";
import { CaseIo, CaseVerdict } from "@/modules/dsa/components/test-case-panel";

/**
 * The named inputs that usually break a solution, each with the reason it matters and a button to try just
 * that one. Edge cases still hidden count toward Submit; only their number is shown.
 */
export function EdgeCasesPanel({
  cases,
  results,
  busy,
  onRun,
}: {
  cases: ProblemTestCase[];
  results: CaseResult[] | null;
  busy: boolean;
  onRun: (indices: number[]) => void;
}) {
  const shown = cases.flatMap((c, i) => (c.edge && !c.hidden ? [{ c, i }] : []));
  const hiddenCount = cases.filter((c) => c.edge && c.hidden).length;

  if (shown.length === 0) return <EmptyState compact icon={Flag} title="No named edge cases for this problem yet." />;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Check these before you submit.{hiddenCount > 0 && ` ${hiddenCount} more are hidden and only run on Submit.`}
        </p>
        <Button type="button" size="sm" variant="outline" className="h-9" disabled={busy} onClick={() => onRun(shown.map((s) => s.i))}>
          <Play /> Run all edges
        </Button>
      </div>
      {shown.map(({ c, i }) => {
        const info = edgeInfo(c.edge!, c.note);
        const result = results?.find((r) => r.index === i);
        return (
          <div key={i} className={cn("rounded-lg border p-3 text-sm", result && (result.pass ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"))}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{info.label}</span>
              <span className="flex items-center gap-2">
                <CaseVerdict result={result} />
                <Button type="button" size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => onRun([i])} aria-label={`Run edge case: ${info.label}`}>
                  <Play /> Run
                </Button>
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{info.rationale}</p>
            <CaseIo c={c} result={result} />
          </div>
        );
      })}
    </div>
  );
}
