import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { topicById } from "@/core/content";
import { cn } from "@/core/utils";
import type { Personalisation } from "@/modules/planner/services/intake-weights";
import { BAR } from "./labels";

type Weight = Personalisation["weights"] extends Map<string, infer W> ? W : never;

/** Weakest topics first: these get the most study time. */
export function StrengthsCard({ strengths }: { strengths: Weight[] }) {
  if (strengths.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strengths and weak spots</CardTitle>
        <CardDescription>Your ratings blended with quiz and practice results. Weakest first; these get the most study time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {strengths.map((w) => (
            <li key={w.topicId} className="text-sm">
              <div className="mb-1 flex justify-between gap-3">
                <Link href={`/learn/${encodeURIComponent(w.topicId)}`} className="min-w-0 truncate hover:underline">
                  {topicById.get(w.topicId)?.title ?? w.topicId}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {w.tier === "must" ? "" : `${w.tier} · `}
                  {Math.round(w.strength)}%
                </span>
              </div>
              <Progress
                value={w.strength}
                className={cn("h-1.5", w.strength >= 70 ? BAR.good : w.strength >= 40 ? BAR.ok : BAR.low)}
                aria-label={`${topicById.get(w.topicId)?.title ?? w.topicId} strength`}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
