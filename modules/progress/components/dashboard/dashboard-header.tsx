import { ArrowRight, CirclePlay, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyActionLink } from "@/components/shared/study-action-link";
import type { StudyGuidance } from "@/modules/progress/domain/study-guidance";
import { formatDate } from "@/core/plan-clock";
import type { StudyNextAction } from "@/modules/progress/domain/next-action";

type Props = {
  greeting: string;
  today: string;
  clock: { week: number; totalWeeks: number; daysUntilStart: number; phase?: { name: string } | null };
  next?: StudyNextAction | null;
  guidance?: StudyGuidance;
  complete: boolean;
};

/** Greeting, plan position and the single next action. */
export function DashboardHeader({ greeting, today, clock, next, guidance, complete }: Props) {
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
        {guidance && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{guidance.label}</span> · {guidance.reason}</p>}
      </div>
      {next ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <StudyActionLink href={next.href} title={next.title}>
            <CirclePlay /> {next.label} <ArrowRight />
          </StudyActionLink>
        </Button>
      ) : complete ? (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success sm:self-auto">
          <PartyPopper className="size-4" /> Day complete. Nice work!
        </p>
      ) : null}
    </div>
  );
}
