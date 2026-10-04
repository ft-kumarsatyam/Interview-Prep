import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle, CornerDownRight, Info, Timer } from "lucide-react";
import { WhyThisPlan } from "@/modules/planner/components/why-this-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, isDateStr } from "@/core/domain/dates";
import { formatDate } from "@/core/plan-clock";
import { DayBacklog } from "@/modules/planner/components/calendar/day-backlog";
import { isPullableDay } from "@/modules/planner/domain/pull-days";
import { describeGap } from "@/modules/progress/domain/recap";
import { ensureToday } from "@/modules/planner/services/plan";
import { getBacklogForDay } from "@/modules/progress/services/backlog";
import { getDayExplanation } from "@/modules/planner/services/explain-day";
import { getCalendarDay, type CalendarDayDetail, type PlanItem } from "@/modules/planner/services/calendar";
import { cn } from "@/core/utils";

export async function generateMetadata({ params }: PageProps<"/calendar/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: isDateStr(date) ? formatDate(date, { day: "numeric", month: "short", year: "numeric" }) : "Calendar" };
}

const KIND_COPY: Record<CalendarDayDetail["kind"], string> = {
  study: "Study day",
  revision: "Revision day",
  sunday: "Sunday · reviews and catch-up",
  rest: "Rest day · keeps your streak",
  outside: "Outside your plan window",
};

function statusLine(d: CalendarDayDetail): string | null {
  if (d.date > d.today) return null;
  switch (d.state) {
    case "complete":
      return "Done";
    case "freeze":
      return "Covered by a freeze token";
    case "caught-up":
      return "Caught up. This day left work undone and you have since done it";
    case "rest":
      return "Planned rest day";
    case "partial":
      return d.date === d.today ? (d.log?.quizPassed ? "Quiz passed, still in progress" : "In progress. The quiz is still needed to complete the day") : "Something is left. It moved to the next days";
    case "idle":
      return "In progress. The quiz is still needed to complete the day";
    default:
      return "Missed. The work moved to the next days";
  }
}

const STATE_PANEL: Partial<Record<CalendarDayDetail["state"], string>> = {
  complete: "border-day-done-line bg-day-done",
  "caught-up": "border-day-caught-line bg-day-caught",
  partial: "border-day-left-line bg-day-left",
  missed: "border-day-missed-line bg-day-missed",
  rest: "border-day-rest-line bg-day-rest",
};

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
  const state = await ensureToday();
  const pullable = isPullableDay(date, state.today, state.settings);
  const dayBacklog = pullable || date === state.today ? await getBacklogForDay({ today: state.today, plan: state.plan, settings: state.settings }, date).catch(() => null) : null;
  const dayLabel = formatDate(date, { weekday: "short", day: "numeric", month: "short" });
  const reasons = await getDayExplanation(date);
  const past = date <= d.today;
  const status = statusLine(d);
  const empty = !d.dsaNew.length && !d.dsaReview.length && !d.extras.length && !d.theory.length && !d.bonus.length;

  const prevDay = addDays(date, -1);
  const nextDay = addDays(date, 1);
  const good = d.state === "complete" || d.state === "caught-up" || d.state === "freeze";
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
        <div className={cn("space-y-3 rounded-xl border p-4", STATE_PANEL[d.state] ?? "bg-card")}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {d.state === "caught-up" ? <CheckCheck className="size-4 text-day-caught-dot" aria-hidden /> : good ? <CheckCircle2 className="size-4 text-day-done-dot" aria-hidden /> : <Circle className="size-4 text-muted-foreground" aria-hidden />}
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
      {d.catchUp && past && date < d.today && (
        <section aria-label="Left over from this day" className="space-y-2 rounded-xl border bg-card p-4 text-sm">
          {d.catchUp.caughtUp ? (
            <p className="flex items-start gap-2">
              <CheckCheck className="mt-0.5 size-4 shrink-0 text-day-caught-dot" aria-hidden />
              <span>
                This day left {describeGap(d.catchUp.gap).join(", ")} undone. It is made up now
                {d.catchUp.paidBy.length > 0 && `: ${d.catchUp.paidBy.map((p) => `${formatDate(p.date, { weekday: "short", day: "numeric", month: "short" })}${p.dsa || p.theory ? ` (${[p.dsa ? `${p.dsa} DSA` : "", p.theory ? `${p.theory} theory` : ""].filter(Boolean).join(", ")})` : ""}`).join(", ")}`}
                . The original miss stays in your history and streak.
              </span>
            </p>
          ) : (
            <>
              <p className="font-medium">Still owed from this day: {describeGap(d.catchUp.remaining).join(", ")}.</p>
              <p className="text-muted-foreground">It is already part of the days ahead. Do extra work, or finish items from your backlog, and this day turns to &ldquo;caught up&rdquo;.{d.catchUp.remaining.quiz ? " The daily quiz can only be taken on its own day, so a missed quiz is made up with a practice quiz on that day's topics." : ""}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/backlog">Open the backlog</Link>
                </Button>
                {d.catchUp.remaining.quiz && d.theory[0] && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/learn/practice?ref=${encodeURIComponent(d.theory[0].id)}`}>Take a catch-up quiz</Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
      )}
      {d.interviews.length > 0 && (
        <ul className="space-y-2" aria-label="Job interviews">
          {d.interviews.map((i) => (
            <li key={i.id}>
              <Link href={`/jobs/${i.id}`} className="flex min-h-11 items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm hover:bg-info/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <Briefcase className="size-4 shrink-0 text-info" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Interview: {i.title} at {i.company}</span>
                  {i.round && <span className="text-muted-foreground"> · {i.round}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {d.lessons.length > 0 && (
        <section aria-label="Lessons finished" className="rounded-xl border bg-card p-4 text-sm">
          <h2 className="mb-1.5 text-sm font-semibold">Course lessons finished</h2>
          <ul className="space-y-0.5">
            {d.lessons.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="inline-flex min-h-9 items-center text-primary underline-offset-2 hover:underline">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">Reading counts as study. It completes a plan topic only when you confirm it on the lesson.</p>
        </section>
      )}
      {d.hours != null && d.estMinutes != null && d.date >= d.today && d.estMinutes > d.hours * 60 + 15 && (
        <p className="flex items-start gap-2 rounded-lg border border-day-left-line bg-day-left p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            About {Math.round(d.estMinutes / 30) / 2} h of work is planned for {d.hours} h. Do what fits; the rest moves to the next days on its own. You can change your hours in{" "}
            <Link href="/plan" className="text-primary underline-offset-2 hover:underline">
              the planner
            </Link>
            .
          </span>
        </p>
      )}
      {d.carriedIn.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-day-left-line bg-day-left p-3 text-sm">
          <CornerDownRight className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Carried in from earlier days:{" "}
            {d.carriedIn.map((c) => `${formatDate(c.date, { weekday: "short", day: "numeric", month: "short" })} (${describeGap(c.remaining).join(", ")})`).join("; ")}. The plan is spread over the days you have left, up to your interview date.
          </span>
        </p>
      )}
      {dayBacklog && (
        <DayBacklog
          date={date}
          dayLabel={dayLabel}
          queued={dayBacklog.queued.map((i) => ({ key: i.key, title: i.title, path: i.path, minutes: i.minutes }))}
          done={dayBacklog.done}
          available={dayBacklog.available.map((i) => ({ key: i.key, title: i.title, path: i.path, minutes: i.minutes }))}
          canAdd={pullable}
        />
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
