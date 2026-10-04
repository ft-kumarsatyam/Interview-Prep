import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/core/plan-clock";
import type { PlanChangeItem } from "@/modules/planner/services/plan-log";
import { CHANGE_LABEL } from "./labels";

/** Every goal, hours, rest-day, re-plan and carry-over decision with its reason. */
export function ChangeLogCard({ changes }: { changes: PlanChangeItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" aria-hidden /> Plan change log
        </CardTitle>
        <CardDescription>Every goal, hours, rest-day, re-plan and carry-over decision, with why. Nothing is rewritten silently.</CardDescription>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet. Entries appear when you edit goals or hours, re-plan a day, or a day closes with work left.</p>
        ) : (
          <ol className="space-y-2.5">
            {changes.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 h-fit shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{CHANGE_LABEL[c.type]}</span>
                <div className="min-w-0">
                  <p className="text-pretty">{c.summary}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.date, { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
