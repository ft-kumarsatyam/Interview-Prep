import { ArrowRight, CirclePlay, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
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

/** Greeting, plan position and the single next action, composed on the shared PageHeader shell. */
export function DashboardHeader({ greeting, today, clock, next, guidance, complete }: Props) {
  return (
    <PageHeader
      title={`${greeting}, ${process.env.ADMIN_NAME || "there"}`}
      description={
        <>
          <p>
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {clock.week === 0
              ? `Plan starts in ${clock.daysUntilStart} day${clock.daysUntilStart === 1 ? "" : "s"}`
              : `Week ${clock.week} of ${clock.totalWeeks} · ${clock.phase?.name}`}
          </p>
          {guidance && (
            <p className="mt-2 text-xs">
              <span className="font-medium text-foreground">{guidance.label}</span> · {guidance.reason}
            </p>
          )}
        </>
      }
    >
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
    </PageHeader>
  );
}
