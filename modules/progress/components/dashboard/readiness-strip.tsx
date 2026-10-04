import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfirmedStudyAction } from "@/components/shared/confirmed-study-action";
import type { TargetSummary } from "@/modules/targets/services/targets";

export function ReadinessStrip({ targets }: { targets: TargetSummary[] }) {
  const priority: Record<TargetSummary["priority"], number> = { dream: 0, target: 1, safe: 2 };
  const focus = [...targets].sort((a, b) => priority[a.priority] - priority[b.priority] || a.overall - b.overall)[0];
  if (!focus) return null;
  const weakest = [...focus.areas].sort((a, b) => a.pct - b.pct)[0];
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Target className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Readiness for {focus.name}</p>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={focus.overall} className="h-2" aria-label={`${focus.name} readiness`} />
            <span className="font-mono text-sm tabular-nums">{focus.overall}%</span>
          </div>
          {weakest && <p className="mt-1 text-xs text-muted-foreground">Next gap: {weakest.label} · {weakest.pct}%</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmedStudyAction href={`/targets/${focus.id}`} title={`${focus.name} readiness blueprint`} />
          <Link href={`/targets/${focus.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open blueprint <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </CardContent>
    </Card>
  );
}
