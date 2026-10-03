import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, Info, Timer } from "lucide-react";
import { WhyThisPlan } from "@/components/planner/why-this-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, isDateStr } from "@/lib/domain/dates";
import { formatDate } from "@/lib/plan-clock";
import { getDayExplanation } from "@/lib/services/explain-day";
import { getCalendarDay, type CalendarDayDetail, type PlanItem } from "@/lib/services/calendar";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/calendar/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: isDateStr(date) ? formatDate(date, { day: "numeric", month: "short", year: "numeric" }) : "Calendar" };
}

const KIND_COPY: Record<CalendarDayDetail["kind"], string> = {
  study: "Study day",
  revision: "Revision day",
  sunday: "Sunday · reviews and catch-up",
  rest: "Rest day · counts as complete",
  outside: "Outside your plan window",
};

function statusLine(d: CalendarDayDetail): string | null {
  if (d.date > d.today) return null;
  if (d.log?.complete) return "Complete";
  if (d.log?.freezeUsed) return "Covered by a freeze token";
  if (d.date === d.today) return d.log?.quizPassed ? "Quiz passed, still in progress" : "In progress · the quiz is still needed to complete the day";
  return d.log && (d.log.dsaSolved || d.log.theoryDone) ? "Partly done" : "Missed";
}

function Section({ title, items, showDone }: { title: string; items: PlanItem[]; showDone: boolean }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={it.href} className="flex min-h-11 items-center gap-3 py-2 hover:text-primary focus-visible:text-primary focus-visible:outline-none">
                {showDone ? (
                  it.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Done" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-label="Not done" />
                  )
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.title}</span>
                  {it.detail && <span className="block truncate text-xs text-muted-foreground">{it.detail}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Meter({ label, done, target }: { label: string; done: number; target: number }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="space-y-1">
        <span className="font-medium tabular-nums">
          {done}
          {target > 0 && <span className="text-muted-foreground">/{target}</span>}
        </span>
        {target > 0 && <Progress value={Math.min(100, (done / target) * 100)} className={cn("h-1", done >= target && "[&>div]:bg-success")} aria-label={`${label} done`} />}
      </dd>
    </div>
  );
}

export default async function CalendarDayPage({ params }: PageProps<"/calendar/[date]">) {
  const { date } = await params;
  if (!isDateStr(date)) notFound();
  const d = await getCalendarDay(date);
  const reasons = await getDayExplanation(date);
  const past = date <= d.today;
  const status = statusLine(d);
  const empty = !d.dsaNew.length && !d.dsaReview.length && !d.extras.length && !d.theory.length && !d.bonus.length;

  const prevDay = addDays(date, -1);
  const nextDay = addDays(date, 1);
  const good = d.log?.complete || d.log?.freezeUsed;
  const planDay = d.kind === "study" || d.kind === "revision" || d.kind === "sunday";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link href={`/calendar?m=${date.slice(0, 7)}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {formatDate(date, { month: "long", year: "numeric" })}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
              {date === d.today && <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 align-middle text-xs font-medium text-primary-foreground">Today</span>}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {KIND_COPY[d.kind]}
              {d.weekNumber > 0 && ` · week ${d.weekNumber}`}
              {d.hours != null && ` · planned for ${d.hours} h`}
              {d.estMinutes != null && ` · about ${Math.round(d.estMinutes / 30) / 2} h of work`}
            </p>
          </div>
          <nav aria-label="Other days" className="flex w-full gap-1 sm:w-auto">
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={`/calendar/${prevDay}`} aria-label={`Previous day, ${formatDate(prevDay, { weekday: "long", day: "numeric", month: "long" })}`}>
                <ChevronLeft /> {formatDate(prevDay, { weekday: "short", day: "numeric" })}
              </Link>
            </Button>
            {date !== d.today && (
              <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none">
                <Link href={`/calendar/${d.today}`}>Today</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={`/calendar/${nextDay}`} aria-label={`Next day, ${formatDate(nextDay, { weekday: "long", day: "numeric", month: "long" })}`}>
                {formatDate(nextDay, { weekday: "short", day: "numeric" })} <ChevronRight />
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      {d.source === "projected" && (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          This is a projection. It assumes every day before it goes to plan, so it changes as you progress. The real plan is fixed on the morning of the day.
        </p>
      )}
      {status && (
        <div className={cn("space-y-3 rounded-xl border p-4", good ? "border-success/30 bg-success/5" : "bg-card")}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {good ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <Circle className="size-4 text-muted-foreground" aria-hidden />}
            {status}
          </p>
          {planDay && (
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <Meter label="DSA" done={d.log?.dsaSolved ?? 0} target={d.dsaTarget} />
              <Meter label="Theory" done={d.log?.theoryDone ?? 0} target={d.theoryTarget} />
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Quiz</dt>
                <dd className={cn("font-medium", d.log?.quizPassed ? "text-success" : "text-muted-foreground")}>{d.log?.quizPassed ? "Passed" : "Not passed"}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
      <WhyThisPlan reasons={reasons} />
      {d.mocks.length > 0 && (
        <ul className="space-y-2">
          {d.mocks.map((m) => (
            <li key={m.kind}>
              <Link
                href={m.done && m.sessionId ? `/mock/${m.sessionId}/report` : "/mock"}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40",
                  m.done ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5",
                )}
              >
                {m.done ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : <Timer className="size-4 shrink-0 text-primary" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{m.kind === "dsa" ? "Weekly DSA mock" : "Weekly system design mock"}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {m.done ? (m.score != null ? `done this week, ${m.score}/100` : "done this week, awaiting grading") : "scheduled. A full mock also counts. Doesn't affect the streak."}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {past && d.source === "none" && d.kind !== "outside" && <p className="text-sm text-muted-foreground">No plan was frozen for this day (the app wasn&apos;t opened).</p>}
      {!past && d.source === "none" && d.kind !== "outside" && <p className="text-sm text-muted-foreground">Nothing is planned for this day.</p>}
      {d.kind !== "outside" && !empty && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="New DSA problems" items={d.dsaNew} showDone={past} />
          <Section title="Theory" items={d.theory} showDone={past} />
          <Section title="Reviews" items={d.dsaReview} showDone={past} />
          <Section title="JS and SQL" items={d.extras} showDone={past} />
          <Section title="Bonus (optional)" items={d.bonus} showDone={past} />
        </div>
      )}
    </div>
  );
}
