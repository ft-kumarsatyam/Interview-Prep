import Link from "next/link";
import { Briefcase, Flag, Play, Timer } from "lucide-react";
import { dayProgress } from "@/modules/planner/domain/calendar-view";
import { dayOfWeek } from "@/core/domain/dates";
import type { HeatState } from "@/modules/progress/domain/heatmap";
import type { DayKind } from "@/modules/planner/domain/planner";
import { formatDate } from "@/core/plan-clock";
import type { CalendarDay, CalendarMonth } from "@/modules/planner/services/calendar";
import { cn } from "@/core/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const STATE_STYLE: Partial<Record<HeatState, { cell: string; dot: string; bar: string; label: string }>> = {
  complete: { cell: "border-day-done-line bg-day-done", dot: "bg-day-done-dot", bar: "bg-day-done-dot", label: "Done" },
  partial: { cell: "border-day-left-line bg-day-left", dot: "bg-day-left-dot", bar: "bg-day-left-dot", label: "Something left" },
  missed: { cell: "border-day-missed-line bg-day-missed", dot: "bg-day-missed-dot", bar: "bg-day-missed-dot", label: "Missed" },
  rest: { cell: "border-day-rest-line bg-day-rest", dot: "bg-day-rest-dot", bar: "bg-day-rest-dot", label: "Rest day" },
  "caught-up": { cell: "border-day-caught-line bg-day-caught", dot: "bg-day-caught-dot", bar: "bg-day-caught-dot", label: "Caught up" },
  freeze: { cell: "border-chart-5/40 bg-chart-5/6", dot: "bg-chart-5", bar: "bg-chart-5", label: "Freeze used" },
};

export const KIND_LABEL: Record<DayKind, string> = { study: "Study", sunday: "Light day", rest: "Rest", revision: "Revision", outside: "Outside plan" };
export const MOCK_LABEL = { dsa: "DSA mock", hld: "System design mock" } as const;

export function daySummary(d: CalendarDay): string {
  if (d.kind === "outside") return "Outside the plan";
  if (d.kind === "rest") return "Rest day";
  const parts = [d.dsaTarget ? `${d.dsaTarget} DSA` : null, d.theoryTarget ? `${d.theoryTarget} theory` : null, d.reviews ? `${d.reviews} review${d.reviews === 1 ? "" : "s"}` : null].filter(Boolean);
  const base = parts.length ? parts.join(" · ") : d.kind === "sunday" ? "Reviews and catch-up" : "Nothing planned";
  const mocks = d.mocks.map((m) => `${MOCK_LABEL[m.kind]}${m.done ? " (done)" : ""}`);
  return [base, ...mocks].join(" · ");
}

export function MonthGrid({ data }: { data: CalendarMonth }) {
  const lead = (dayOfWeek(data.days[0].date) + 6) % 7;
  const trail = (7 - ((lead + data.days.length) % 7)) % 7;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-2xs font-medium tracking-wide text-muted-foreground uppercase sm:text-xs" aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn("py-2", i >= 5 && "text-foreground/70")}>
              <span className="sm:hidden">{w[0]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: lead }, (_, i) => (
            <li key={`pad-${i}`} className="bg-muted/20" aria-hidden />
          ))}
          {data.days.map((d) => (
            <li key={d.date} className="bg-card">
              <DayCell d={d} today={data.today} isStart={d.date === data.startDate} isEnd={d.date === data.endDate} />
            </li>
          ))}
          {Array.from({ length: trail }, (_, i) => (
            <li key={`trail-${i}`} className="bg-muted/20" aria-hidden />
          ))}
        </ol>
      </div>
      <Legend />
    </div>
  );
}

function DayCell({ d, today, isStart, isEnd }: { d: CalendarDay; today: string; isStart: boolean; isEnd: boolean }) {
  const isToday = d.date === today;
  const outside = d.kind === "outside";
  const style = d.date <= today ? STATE_STYLE[d.state] : undefined;
  const progress = dayProgress(d);
  const light = d.kind === "rest" || d.kind === "sunday";
  return (
    <Link
      href={`/calendar/${d.date}`}
      aria-label={`${formatDate(d.date, { weekday: "long", day: "numeric", month: "long" })}: ${daySummary(d)}${style ? `, ${style.label.toLowerCase()}` : ""}${isToday ? " (today)" : ""}`}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "group relative flex h-full min-h-16 flex-col gap-1 border border-transparent p-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-28 sm:p-2",
        style?.cell,
        light && !style && "bg-muted/25",
        outside && "bg-transparent text-muted-foreground/60",
        isToday && "z-[1] ring-2 ring-primary ring-inset",
      )}
    >
      <span className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums sm:size-7 sm:text-sm",
            isToday && "bg-primary text-primary-foreground",
            !isToday && d.date < today && !outside && "text-foreground/80",
          )}
        >
          {Number(d.date.slice(8))}
        </span>
        <span className="flex items-center gap-1 pt-1">
          {d.mocks.length > 0 && <Timer className={cn("size-3 sm:hidden", d.mocks.every((m) => m.done) ? "text-success" : "text-primary")} aria-hidden />}
          {d.interviews.length > 0 && <Briefcase className="size-3 text-info sm:hidden" aria-label="Job interview" />}
          {isEnd && <Flag className="size-3 text-destructive sm:hidden" aria-hidden />}
          {style && <span className={cn("size-2 rounded-full sm:hidden", style.dot)} aria-hidden />}
        </span>
      </span>

      {(isStart || isEnd) && (
        <span className={cn("hidden w-fit items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium sm:inline-flex", isEnd ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {isEnd ? <Flag className="size-3" aria-hidden /> : <Play className="size-3" aria-hidden />}
          {isEnd ? "Interview" : "Plan start"}
        </span>
      )}

      {!outside && (
        <>
          <span className="mt-auto text-2xs leading-tight text-muted-foreground sm:hidden">
            {d.kind === "rest" ? "Rest" : d.dsaTarget || d.theoryTarget ? `${d.dsaTarget}·${d.theoryTarget}` : ""}
          </span>
          <span className="hidden min-w-0 flex-col gap-1 text-2xs leading-tight sm:flex">
            {d.kind !== "study" && <span className="font-medium text-foreground/80">{KIND_LABEL[d.kind]}</span>}
            {(d.dsaTarget > 0 || d.theoryTarget > 0 || d.reviews > 0) && (
              <span className="flex flex-wrap gap-1">
                {d.dsaTarget > 0 && <Pill>{d.done ? `${Math.min(d.done.dsa, d.dsaTarget)}/${d.dsaTarget}` : d.dsaTarget} DSA</Pill>}
                {d.theoryTarget > 0 && <Pill>{d.done ? `${Math.min(d.done.theory, d.theoryTarget)}/${d.theoryTarget}` : d.theoryTarget} theory</Pill>}
                {d.reviews > 0 && <Pill>{d.reviews} rev</Pill>}
              </span>
            )}
            {d.interviews.map((i) => (
              <span key={i.id} className="flex items-center gap-1 rounded bg-info/10 px-1 py-0.5 font-medium text-info">
                <Briefcase className="size-3 shrink-0" aria-hidden />
                <span className="truncate">Interview: {i.company}</span>
              </span>
            ))}
            {d.owed > 0 && <span className="w-fit rounded bg-background/70 px-1 py-0.5 font-medium text-foreground/80">{d.owed} left, moved on</span>}
            {d.state === "caught-up" && <span className="w-fit rounded bg-background/70 px-1 py-0.5 font-medium text-foreground/80">Caught up</span>}
            {d.source === "projected" && d.estMinutes != null && <span className="text-muted-foreground">~{Math.round(d.estMinutes / 30) / 2} h</span>}
            {d.mocks.map((m) => (
              <span key={m.kind} className={cn("flex items-center gap-1 rounded bg-primary/10 px-1 py-0.5 font-medium text-primary", m.done && "bg-success/10 text-success")}>
                <Timer className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{m.kind === "dsa" ? "DSA mock" : "SD mock"}</span>
              </span>
            ))}
          </span>
          {progress !== null && (
            <span className="mt-auto h-1 w-full overflow-hidden rounded-full bg-muted sm:mt-1" aria-hidden>
              <span className={cn("block h-full rounded-full", style?.bar ?? "bg-primary")} style={{ width: `${Math.max(progress * 100, progress > 0 ? 8 : 0)}%` }} />
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground tabular-nums">{children}</span>;
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {(["complete", "partial", "missed", "caught-up", "rest", "freeze"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", STATE_STYLE[s]!.dot)} /> {STATE_STYLE[s]!.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <Timer className="size-3 text-primary" aria-hidden /> Weekly mock (never affects the streak)
      </span>
      <span className="flex items-center gap-1.5">
        <Flag className="size-3 text-destructive" aria-hidden /> Interview date
      </span>
      <span className="sm:hidden">Numbers are DSA·theory.</span>
      <span>Future days are a projection and change as you progress.</span>
      <span>Work you leave undone moves to the next days by itself. When you do it later, the old day turns \u201Ccaught up\u201D.</span>
    </div>
  );
}
