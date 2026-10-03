import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MonthGrid } from "@/components/calendar/month-grid";
import { getCalendarMonth, isMonthStr } from "@/lib/services/calendar";

export const metadata: Metadata = { title: "Calendar" };

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const { m } = await searchParams;
  const data = await getCalendarMonth(typeof m === "string" && isMonthStr(m) ? m : undefined);
  const month = data.month;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const canPrev = prev >= data.startDate.slice(0, 7);
  const canNext = next <= data.endDate.slice(0, 7);

  return (
    <>
      <PageHeader icon={CalendarDays} title="Calendar" description="Your plan by date. Past days show what was frozen and done; future days are a projection that updates as you progress.">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" aria-label="Previous month" className={canPrev ? "" : "pointer-events-none opacity-40"}>
            <Link href={`/calendar?m=${prev}`} aria-disabled={!canPrev} tabIndex={canPrev ? undefined : -1}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium tabular">{monthLabel(month)}</span>
          <Button asChild variant="outline" size="icon" aria-label="Next month" className={canNext ? "" : "pointer-events-none opacity-40"}>
            <Link href={`/calendar?m=${next}`} aria-disabled={!canNext} tabIndex={canNext ? undefined : -1}>
              <ChevronRight />
            </Link>
          </Button>
          {month !== data.today.slice(0, 7) && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/calendar">Today</Link>
            </Button>
          )}
        </div>
      </PageHeader>
      <MonthGrid data={data} />
    </>
  );
}
