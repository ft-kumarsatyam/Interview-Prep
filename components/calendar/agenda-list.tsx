import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, CircleAlert, CircleDashed, Coffee, Flag, Snowflake, Timer } from "lucide-react";
import { dayProgress, groupByWeek } from "@/lib/domain/calendar-view";
import { formatDate } from "@/lib/plan-clock";
import type { CalendarDay, CalendarMonth } from "@/lib/services/calendar";
import { cn } from "@/lib/utils";
import { KIND_LABEL, STATE_STYLE } from "./month-grid";

function Status({ d, today }: { d: CalendarDay; today: string }) {
  if (d.kind === "outside") return null;
  if (d.kind === "rest") return <Coffee className="size-4 text-muted-foreground" aria-label="Rest day" />;
  if (d.date > today) return <CircleDashed className="size-4 text-muted-foreground/60" aria-label="Upcoming" />;
  if (d.state === "complete") return <CheckCircle2 className="size-4 text-success" aria-label="Complete" />;
  if (d.state === "freeze") return <Snowflake className="size-4 text-chart-5" aria-label="Freeze used" />;
  if (d.state === "partial") return <CircleAlert className="size-4 text-warning" aria-label="Partly done" />;
  if (d.state === "missed") return <CircleAlert className="size-4 text-destructive" aria-label="Missed" />;
  return <Circle className="size-4 text-primary" aria-label="In progress" />;
}

/** The month as a list, one row per day grouped by week. Reads better than the grid on a phone. */
export function AgendaList({ data }: { data: CalendarMonth }) {
  const weeks = groupByWeek(data.days);
  return (
    <div className="space-y-5">
      {weeks.map((week) => {
        const plan = week.filter((d) => d.kind === "study" || d.kind === "sunday" || d.kind === "revision");
        const past = plan.filter((d) => d.date <= data.today);
        const done = past.filter((d) => d.state === "complete" || d.state === "freeze").length;
        return (
          <section key={week[0]!.date} aria-label={`Week of ${formatDate(week[0]!.date, { day: "numeric", month: "long" })}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {formatDate(week[0]!.date, { day: "numeric", month: "short" })} – {formatDate(week[week.length - 1]!.date, { day: "numeric", month: "short" })}
              </h2>
              {past.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {done}/{past.length} days complete
                </span>
              )}
            </div>
            <ol className="divide-y overflow-hidden rounded-xl border bg-card">
              {week.map((d) => (
                <li key={d.date} id={d.date === data.today ? "today" : undefined} className="scroll-mt-24">
                  <AgendaRow d={d} today={data.today} isEnd={d.date === data.endDate} isStart={d.date === data.startDate} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function AgendaRow({ d, today, isStart, isEnd }: { d: CalendarDay; today: string; isStart: boolean; isEnd: boolean }) {
  const isToday = d.date === today;
  const outside = d.kind === "outside";
  const progress = dayProgress(d);
  const style = d.date <= today ? STATE_STYLE[d.state] : undefined;
  const targets = [
    d.dsaTarget > 0 ? `${d.done ? `${Math.min(d.done.dsa, d.dsaTarget)}/` : ""}${d.dsaTarget} DSA` : null,
    d.theoryTarget > 0 ? `${d.done ? `${Math.min(d.done.theory, d.theoryTarget)}/` : ""}${d.theoryTarget} theory` : null,
    d.reviews > 0 ? `${d.reviews} review${d.reviews === 1 ? "" : "s"}` : null,
    d.done && (d.kind === "study" || d.kind === "revision" || d.kind === "sunday") ? `quiz ${d.done.quiz ? "passed" : "open"}` : null,
  ].filter(Boolean);
  return (
    <Link
      href={`/calendar/${d.date}`}
      aria-current={isToday ? "date" : undefined}
      className={cn("flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none", isToday && "bg-primary/5", outside && "text-muted-foreground/70")}
    >
      <span className={cn("flex w-11 shrink-0 flex-col items-center rounded-lg py-1", isToday ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
        <span className="text-2xs font-medium uppercase">{formatDate(d.date, { weekday: "short" })}</span>
        <span className="text-base leading-tight font-semibold tabular-nums">{Number(d.date.slice(8))}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium">{isToday ? "Today" : KIND_LABEL[d.kind]}</span>
          {isToday && d.kind !== "study" && <span className="text-muted-foreground">· {KIND_LABEL[d.kind]}</span>}
          {style && !isToday && <span className="text-xs text-muted-foreground">· {style.label}</span>}
          {d.source === "projected" && !outside && <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">projected</span>}
          {isStart && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-2xs font-medium text-primary">Plan start</span>}
          {isEnd && (
            <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-2xs font-medium text-destructive">
              <Flag className="size-3" aria-hidden /> Interview
            </span>
          )}
        </span>
        {!outside && d.kind !== "rest" && (
          <span className="block truncate text-xs text-muted-foreground tabular-nums">
            {targets.length ? targets.join(" · ") : d.kind === "sunday" ? "Reviews and catch-up" : "Nothing planned"}
            {d.source === "projected" && d.estMinutes != null && ` · ~${Math.round(d.estMinutes / 30) / 2} h`}
          </span>
        )}
        {d.mocks.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {d.mocks.map((m) => (
              <span key={m.kind} className={cn("inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-2xs font-medium text-primary", m.done && "bg-success/10 text-success")}>
                <Timer className="size-3" aria-hidden /> {m.kind === "dsa" ? "DSA mock" : "System design mock"}
                {m.done && " · done"}
              </span>
            ))}
          </span>
        )}
        {progress !== null && (
          <span className="block h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className={cn("block h-full rounded-full", style?.bar ?? "bg-primary")} style={{ width: `${Math.max(progress * 100, progress > 0 ? 6 : 0)}%` }} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Status d={d} today={today} />
        <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden />
      </span>
    </Link>
  );
}
