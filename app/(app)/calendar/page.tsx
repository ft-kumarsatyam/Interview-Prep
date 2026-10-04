import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Code2, Hourglass, LayoutGrid, List } from "lucide-react";
import { AgendaList } from "@/modules/planner/components/calendar/agenda-list";
import { Legend, MonthGrid } from "@/modules/planner/components/calendar/month-grid";
import { chipClass } from "@/components/shared/chip";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { StatTile } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { summarizeMonth } from "@/modules/planner/domain/calendar-view";
import { Suspense } from "react";
import { CarrySection } from "@/modules/planner/components/carry-section";
import { ensureToday } from "@/modules/planner/services/plan";
import { getCalendarMonth, isMonthStr } from "@/modules/planner/services/calendar";
import { cn } from "@/core/utils";

export const metadata: Metadata = { title: "Calendar" };

type View = "month" | "list" | "auto";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthLabel(month: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-IN", { month: style, year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

/** With no saved choice, phones get the list and wider screens the grid; the chips show that. */
const AUTO_MONTH = "sm:border-primary/40 sm:bg-primary/10 sm:font-medium sm:text-primary";
const AUTO_LIST = "max-sm:border-primary/40 max-sm:bg-primary/10 max-sm:font-medium max-sm:text-primary";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { m, view: rawView } = await searchParams;
  const view: View = rawView === "month" || rawView === "list" ? rawView : "auto";
  const today = await ensureToday();
  const data = await getCalendarMonth(typeof m === "string" && isMonthStr(m) ? m : undefined);
  const month = data.month;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const canPrev = prev >= data.startDate.slice(0, 7);
  const canNext = next <= data.endDate.slice(0, 7);
  const isThisMonth = month === data.today.slice(0, 7);
  const href = (opts: { m?: string; view?: View }) => {
    const p = new URLSearchParams();
    const mm = opts.m ?? month;
    if (mm !== data.today.slice(0, 7)) p.set("m", mm);
    const v = opts.view ?? view;
    if (v !== "auto") p.set("view", v);
    const q = p.toString();
    return `/calendar${q ? `?${q}` : ""}`;
  };
  const s = summarizeMonth(data.days, data.today);
  const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

  return (
    <>
      <PageHeader icon={CalendarDays} title="Calendar" description="Your plan by date. Past days show what was planned and done; future days are a projection that updates as you progress.">
        <nav aria-label="Month" className="flex w-full items-center gap-1 sm:w-auto">
          <Button asChild variant="outline" size="icon" aria-label={`Previous month, ${monthLabel(prev)}`} className={canPrev ? "" : "pointer-events-none opacity-40"}>
            <Link href={href({ m: prev })} aria-disabled={!canPrev} tabIndex={canPrev ? undefined : -1}>
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="min-w-36 flex-1 text-center text-sm font-semibold tabular-nums sm:flex-none" aria-live="polite">
            {monthLabel(month)}
          </h2>
          <Button asChild variant="outline" size="icon" aria-label={`Next month, ${monthLabel(next)}`} className={canNext ? "" : "pointer-events-none opacity-40"}>
            <Link href={href({ m: next })} aria-disabled={!canNext} tabIndex={canNext ? undefined : -1}>
              <ChevronRight />
            </Link>
          </Button>
          <Button asChild variant={isThisMonth ? "ghost" : "secondary"} size="sm" className="ml-1">
            <Link href={`${href({ m: data.today.slice(0, 7) })}#today`}>Today</Link>
          </Button>
        </nav>
      </PageHeader>

      <PageStack>
      <Suspense fallback={null}>
        <CarrySection today={today.today} plan={today.plan} settings={today.settings} />
      </Suspense>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatTile icon={CalendarCheck} tone="success" label="Days complete" value={s.elapsed ? `${s.complete}/${s.elapsed}` : "–"} hint={s.elapsed ? `${s.partial} with something left · ${s.missed} missed${s.caughtUp ? ` · ${s.caughtUp} caught up` : ""}` : "No plan days yet this month"}>
          {s.elapsed > 0 && <Progress value={pct(s.complete, s.elapsed)} className="mt-1 h-1 [&>div]:bg-success" aria-label="Days complete" />}
        </StatTile>
        <StatTile icon={Code2} tone="primary" label="DSA this month" value={`${s.dsaDone}/${s.dsaPlanned}`} hint="Done so far of all planned">
          <Progress value={pct(s.dsaDone, s.dsaPlanned)} className="mt-1 h-1" aria-label="DSA done" />
        </StatTile>
        <StatTile icon={BookOpen} tone="info" label="Theory this month" value={`${s.theoryDone}/${s.theoryPlanned}`} hint="Subtopics done of all planned">
          <Progress value={pct(s.theoryDone, s.theoryPlanned)} className="mt-1 h-1 [&>div]:bg-info" aria-label="Theory done" />
        </StatTile>
        <StatTile icon={Hourglass} tone="warning" label="Still ahead" value={`${s.ahead} day${s.ahead === 1 ? "" : "s"}`} hint={s.ahead ? `About ${s.hoursAhead} h of work${s.rest ? ` · ${s.rest} rest` : ""}` : s.rest ? `${s.rest} rest days` : "Nothing left this month"} />
      </div>

      <section aria-label="Days" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Calendar view" className="flex gap-1.5">
          <Link href={href({ view: "month" })} aria-current={view === "month" ? "page" : undefined} className={cn(chipClass(view === "month"), view === "auto" && AUTO_MONTH)}>
            <LayoutGrid className="size-4" aria-hidden /> Month
          </Link>
          <Link href={href({ view: "list" })} aria-current={view === "list" ? "page" : undefined} className={cn(chipClass(view === "list"), view === "auto" && AUTO_LIST)}>
            <List className="size-4" aria-hidden /> List
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Tap a day to see its problems and topics.</p>
      </div>

      {view === "month" && <MonthGrid data={data} />}
      {view === "list" && (
        <div className="space-y-3">
          <AgendaList data={data} />
          <Legend />
        </div>
      )}
      {view === "auto" && (
        <>
          <div className="hidden sm:block">
            <MonthGrid data={data} />
          </div>
          <div className="space-y-3 sm:hidden">
            <AgendaList data={data} />
            <Legend />
          </div>
        </>
      )}
      </section>
      </PageStack>
    </>
  );
}
