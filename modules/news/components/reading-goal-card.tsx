import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { READINGS_PER_DAY } from "@/modules/planner/domain/plan-config";
import { cn } from "@/core/utils";

export function ReadingGoalCard({ readings, unread }: { readings: number; unread: number }) {
  const done = readings >= READINGS_PER_DAY;
  const left = Math.max(0, READINGS_PER_DAY - readings);
  const pct = Math.min(100, Math.round((readings / READINGS_PER_DAY) * 100));
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4 sm:p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", done ? "bg-success/12 text-success" : "bg-primary/10 text-primary")}>
        <BookOpenCheck className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium">{done ? "Reading bonus done for today" : `Read ${left} more for today's bonus`}</p>
          <p className="tabular font-mono text-xs text-muted-foreground">
            {readings}/{READINGS_PER_DAY} read today
          </p>
        </div>
        <Progress value={pct} aria-label={`${readings} of ${READINGS_PER_DAY} readings today`} className={cn("h-1.5", done && "[&>[data-slot=progress-indicator]]:bg-success")} />
        <p className="text-xs text-muted-foreground">
          Opening an article in the reader counts.{" "}
          {unread > 0 && (
            <Link href="/news?f=unread" className="font-medium text-foreground underline-offset-2 hover:underline">
              {unread} unread
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
