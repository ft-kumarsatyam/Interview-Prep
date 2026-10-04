import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/core/plan-clock";
import type { Requirement } from "@/modules/progress/domain/dashboard-view";
import { REQUIREMENT_ICONS } from "./requirement-icons";

type Props = {
  greeting: string;
  today: string;
  clock: { week: number; totalWeeks: number; daysUntilStart: number; phase?: { name: string } | null };
  next?: Requirement;
  complete: boolean;
};

/** Greeting, plan position and the single next action. */
export function DashboardHeader({ greeting, today, clock, next, complete }: Props) {
  const NextIcon = next ? REQUIREMENT_ICONS[next.icon] : null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting}, {process.env.ADMIN_NAME || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {clock.week === 0
            ? `Plan starts in ${clock.daysUntilStart} day${clock.daysUntilStart === 1 ? "" : "s"}`
            : `Week ${clock.week} of ${clock.totalWeeks} · ${clock.phase?.name}`}
        </p>
      </div>
      {next && NextIcon ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={next.href}>
            <NextIcon /> {next.cta} <ArrowRight />
          </Link>
        </Button>
      ) : complete ? (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success sm:self-auto">
          <PartyPopper className="size-4" /> Day complete. Nice work!
        </p>
      ) : null}
    </div>
  );
}
