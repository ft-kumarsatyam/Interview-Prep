import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, Info, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, isDateStr } from "@/lib/domain/dates";
import { formatDate } from "@/lib/plan-clock";
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

export default async function CalendarDayPage({ params }: PageProps<"/calendar/[date]">) {
  const { date } = await params;
  if (!isDateStr(date)) notFound();
  const d = await getCalendarDay(date);
  const past = date <= d.today;
  const status = statusLine(d);
  const empty = !d.dsaNew.length && !d.dsaReview.length && !d.extras.length && !d.theory.length && !d.bonus.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/calendar?m=${date.slice(0, 7)}`} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Back to the month">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {date === d.today && <span className="ml-2 align-middle text-sm font-medium text-primary">Today</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {KIND_COPY[d.kind]}
            {d.weekNumber > 0 && ` · week ${d.weekNumber}`}
            {d.hours != null && ` · planned for ${d.hours}h`}
            {d.estMinutes != null && ` · about ${Math.round(d.estMinutes / 30) / 2}h of work`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button asChild variant="outline" size="icon" aria-label="Previous day">
            <Link href={`/calendar/${addDays(date, -1)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Next day">
            <Link href={`/calendar/${addDays(date, 1)}`}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      {d.source === "projected" && (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Projection: this assumes you finish every day before it as planned. It changes as you progress, and the real plan is frozen on the morning of the day.
        </p>
      )}
      {status && (
        <div className={cn("rounded-lg border p-3 text-sm", d.log?.complete || d.log?.freezeUsed ? "border-success/30 bg-success/5" : "bg-card")}>
          <span className="font-medium">{status}</span>
          {d.log && (
            <span className="text-muted-foreground">
              {" "}
              · {d.log.dsaSolved} solved · {d.log.theoryDone} theory · quiz {d.log.quizPassed ? "passed" : "not passed"}
            </span>
          )}
        </div>
      )}
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
