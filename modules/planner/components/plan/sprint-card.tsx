import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/core/plan-clock";
import { cn } from "@/core/utils";
import type { SprintView } from "@/modules/planner/services/planner";
import { KIND_LABEL, STATUS } from "./labels";

/** The selected week: objectives, completion so far and a day-by-day list. */
export function SprintCard({ sprint }: { sprint: SprintView }) {
  const { summary } = sprint;
  const [statusLabel, statusClass] = STATUS[summary.status];
  return (
    <Card id="sprint" className="scroll-mt-20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>
              Week {sprint.week} of {sprint.totalWeeks}
              {sprint.phase && <span className="font-normal text-muted-foreground"> · {sprint.phase.name}</span>}
            </CardTitle>
            <CardDescription>
              {formatDate(sprint.from, { day: "numeric", month: "short" })} – {formatDate(sprint.to, { day: "numeric", month: "short" })}
              {sprint.phase && ` · ${sprint.phase.outcome}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass)}>{statusLabel}</span>
            <Link
              href={`/plan?w=${sprint.week - 1}#sprint`}
              aria-label="Previous week"
              aria-disabled={sprint.week <= 1}
              className={cn("grid size-8 place-items-center rounded-md hover:bg-muted", sprint.week <= 1 && "pointer-events-none opacity-40")}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <Link
              href={`/plan?w=${sprint.week + 1}#sprint`}
              aria-label="Next week"
              aria-disabled={sprint.week >= sprint.totalWeeks}
              className={cn("grid size-8 place-items-center rounded-md hover:bg-muted", sprint.week >= sprint.totalWeeks && "pointer-events-none opacity-40")}
            >
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Target className="size-4 text-primary" aria-hidden /> Sprint objectives
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              {summary.dsaPlanned} DSA problems, {summary.theoryPlanned} theory subtopics, {summary.reviewsPlanned} spaced reviews and {summary.quizzesPlanned} quizzes
              {summary.estMinutes > 0 && <span className="text-muted-foreground"> · about {Math.round(summary.estMinutes / 60)} h of work</span>}
            </li>
            {sprint.topics.length > 0 && (
              <li className="flex flex-wrap gap-1.5 pt-1">
                {sprint.topics.map((t) => (
                  <Link key={t.id} href={`/learn/${encodeURIComponent(t.id)}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:border-primary/50 hover:bg-primary/5">
                    {t.title}{" "}
                    <span className="text-muted-foreground tabular-nums">
                      {t.done}/{t.subtopics}
                    </span>
                  </Link>
                ))}
              </li>
            )}
          </ul>
        </div>

        {summary.completionRate !== null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>
                {summary.doneToDate} of {summary.plannedToDate} items due so far
              </span>
              <span className="tabular-nums">{Math.round(summary.completionRate * 100)}%</span>
            </div>
            <Progress value={summary.completionRate * 100} className="h-1.5" aria-label="Sprint completion so far" />
          </div>
        )}

        <ol className="divide-y rounded-lg border text-sm">
          {sprint.days.map((d) => {
            const work = d.kind === "study" || d.kind === "revision" || d.kind === "sunday";
            const isToday = d.date === sprint.today;
            return (
              <li key={d.date}>
                <Link href={`/calendar/${d.date}`} className={cn("flex items-center gap-3 px-3 py-2 hover:bg-muted/50", isToday && "bg-primary/5")}>
                  {d.complete ? (
                    <Check className="size-4 shrink-0 text-success" aria-label="Complete" />
                  ) : (
                    <Circle
                      className={cn("size-4 shrink-0", d.date < sprint.today && work ? "text-warning" : "text-muted-foreground/50")}
                      aria-label={d.date < sprint.today && work ? "Not complete" : "Open"}
                    />
                  )}
                  <span className="w-24 shrink-0 font-medium">{formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="w-20 shrink-0 text-muted-foreground">{KIND_LABEL[d.kind]}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground tabular-nums">
                    {work && d.kind !== "sunday"
                      ? `DSA ${d.dsaSolved}/${d.dsaTarget} · theory ${d.theoryDone}/${d.theoryTarget} · quiz ${d.quizPassed ? "passed" : "open"}`
                      : d.kind === "sunday"
                        ? `weekly quiz ${d.quizPassed ? "passed" : "open"}`
                        : ""}
                  </span>
                  {d.minutes > 0 && <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">{d.minutes} min</span>}
                  {d.source === "projected" && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">projected</span>}
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          Projected days follow your real progress and can still change. A day&apos;s plan freezes when it begins; anything unfinished moves to the front of the next one.
        </p>
      </CardContent>
    </Card>
  );
}
