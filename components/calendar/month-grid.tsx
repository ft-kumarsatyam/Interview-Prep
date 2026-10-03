import Link from "next/link";
import { Timer } from "lucide-react";
import { dayOfWeek } from "@/lib/domain/dates";
import type { HeatState } from "@/lib/domain/heatmap";
import type { DayKind } from "@/lib/domain/planner";
import { formatDate } from "@/lib/plan-clock";
import type { CalendarDay, CalendarMonth } from "@/lib/services/calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATE_DOT: Partial<Record<HeatState, string>> = {
  complete: "bg-success",
  partial: "bg-warning",
  missed: "bg-destructive/70",
  freeze: "bg-chart-5",
};

const KIND_LABEL: Partial<Record<DayKind, string>> = { sunday: "Light day", rest: "Rest", revision: "Revision" };

function summary(d: CalendarDay): string {
  if (d.kind === "outside") return "Outside the plan";
  if (d.kind === "rest") return "Rest day";
  const parts = [d.dsaTarget ? `${d.dsaTarget} DSA` : null, d.theoryTarget ? `${d.theoryTarget} theory` : null, d.reviews ? `${d.reviews} review${d.reviews === 1 ? "" : "s"}` : null].filter(Boolean);
  const base = parts.length ? parts.join(" · ") : d.kind === "sunday" ? "Reviews and catch-up" : "Nothing planned";
  const mocks = d.mocks.map((m) => `${MOCK_LABEL[m.kind]}${m.done ? " (done)" : ""}`);
  return [base, ...mocks].join(" · ");
}

const MOCK_LABEL = { dsa: "DSA mock", hld: "System design mock" } as const;

export function MonthGrid({ data }: { data: CalendarMonth }) {
  const lead = (dayOfWeek(data.days[0].date) + 6) % 7;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground sm:gap-2 sm:text-xs" aria-hidden>
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: lead }, (_, i) => (
          <li key={`pad-${i}`} aria-hidden />
        ))}
        {data.days.map((d) => {
          const isToday = d.date === data.today;
          const outside = d.kind === "outside";
          const dot = d.date <= data.today ? STATE_DOT[d.state] : undefined;
          return (
            <li key={d.date}>
              <Link
                href={`/calendar/${d.date}`}
                aria-label={`${formatDate(d.date, { weekday: "long", day: "numeric", month: "long" })}: ${summary(d)}${isToday ? " (today)" : ""}`}
                className={cn(
                  "flex aspect-square flex-col rounded-lg border bg-card p-1 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:aspect-auto sm:min-h-24 sm:p-2",
                  outside && "border-dashed bg-transparent text-muted-foreground/60",
                  (d.kind === "rest" || d.kind === "sunday") && "bg-muted/30",
                  isToday && "border-primary ring-1 ring-primary",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs font-semibold tabular sm:text-sm", isToday && "text-primary")}>{Number(d.date.slice(8))}</span>
                  <span className="flex items-center gap-1">
                    {d.mocks.length > 0 && (
                      <Timer className={cn("size-3 sm:hidden", d.mocks.every((m) => m.done) ? "text-success" : "text-primary")} aria-hidden />
                    )}
                    {dot && <span className={cn("size-2 rounded-full", dot)} aria-hidden />}
                  </span>
                </span>
                {!outside && (
                  <>
                    <span className="mt-auto text-[10px] leading-tight text-muted-foreground sm:hidden">{d.dsaTarget ? `${d.dsaTarget}·${d.theoryTarget}` : (KIND_LABEL[d.kind]?.[0] ?? "")}</span>
                    <span className="mt-1 hidden space-y-0.5 text-[11px] leading-tight text-muted-foreground sm:block">
                      {KIND_LABEL[d.kind] && <span className="block font-medium text-foreground/80">{KIND_LABEL[d.kind]}</span>}
                      {d.dsaTarget > 0 && <span className="block">{d.dsaTarget} DSA</span>}
                      {d.theoryTarget > 0 && <span className="block">{d.theoryTarget} theory</span>}
                      {d.reviews > 0 && <span className="block">{d.reviews} review{d.reviews === 1 ? "" : "s"}</span>}
                      {d.source === "projected" && d.estMinutes != null && <span className="block opacity-70">~{Math.round(d.estMinutes / 30) / 2}h</span>}
                      {d.mocks.map((m) => (
                        <span key={m.kind} className={cn("mt-1 flex items-center gap-1 rounded bg-primary/10 px-1 py-0.5 font-medium text-primary", m.done && "bg-success/10 text-success")}>
                          <Timer className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{m.kind === "dsa" ? "DSA mock" : "SD mock"}</span>
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(["complete", "partial", "missed", "freeze"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", STATE_DOT[s])} /> {s === "freeze" ? "freeze used" : s}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <Timer className="size-3 text-primary" aria-hidden /> weekly mock (never affects the streak)
        </span>
        <span className="sm:hidden">Numbers are DSA·theory.</span>
        <span>Future days are a projection and change as you progress.</span>
      </div>
    </div>
  );
}
