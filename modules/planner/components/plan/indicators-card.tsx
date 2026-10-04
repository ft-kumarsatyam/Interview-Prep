import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/core/utils";
import type { getIndicators } from "@/modules/planner/services/planner";
import { BAR, TONE } from "./labels";

/** The seven separate readiness measures. */
export function IndicatorsCard({ indicators }: { indicators: Awaited<ReturnType<typeof getIndicators>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress indicators</CardTitle>
        <CardDescription>Seven separate measures. A streak or a solve count alone doesn&apos;t mean you&apos;re interview-ready.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {indicators.map((i) => (
          <div key={i.id} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{i.label}</p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", TONE[i.tone])}>{i.value}</p>
            {i.frac !== null && <Progress value={i.frac * 100} className={cn("mt-1.5 h-1", BAR[i.tone])} aria-label={i.label} />}
            <p className="mt-1.5 text-xs text-muted-foreground">{i.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
