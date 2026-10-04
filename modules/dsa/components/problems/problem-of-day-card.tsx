import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/core/plan-clock";
import { cn } from "@/core/utils";
import type { AheadPick, ProblemOfDay } from "@/modules/dsa/services/problem-of-day";

const DIFF_CLASS = { Easy: "text-success", Medium: "text-warning", Hard: "text-destructive" } as const;

function PaceBadge({ delta }: { delta: number }) {
  if (delta > 0) return <ToneBadge tone="success">{delta} ahead of plan</ToneBadge>;
  if (delta < 0) return <ToneBadge tone="warning">{-delta} behind plan</ToneBadge>;
  return <ToneBadge>On pace</ToneBadge>;
}

function impactLine({ pick, impact }: Pick<ProblemOfDay, "pick" | "impact">): string | null {
  if (!pick || !impact) return null;
  const when = impact.scheduledOn ? formatDate(impact.scheduledOn) : null;
  if (impact.daysSaved > 0 && impact.finishWith && impact.finishWithout) {
    const days = `${impact.daysSaved} day${impact.daysSaved === 1 ? "" : "s"} earlier`;
    return pick.solvedToday
      ? `Pulled forward: the DSA track now finishes on ${formatDate(impact.finishWith)} instead of ${formatDate(impact.finishWithout)}, ${days}.`
      : `Solve it today and the DSA track finishes on ${formatDate(impact.finishWith)} instead of ${formatDate(impact.finishWithout)}, ${days}.`;
  }
  if (when) return pick.solvedToday ? `Pulled forward: ${when} now has one problem less.` : `It was planned for ${when}. Solving it today takes it off that day.`;
  return pick.solvedToday ? "Pulled forward: one problem less left in the plan." : "Solving it today means one problem less left in the plan.";
}

function UpNextRow({ p }: { p: AheadPick }) {
  return (
    <li>
      <Link href={`/dsa/${p.slug}`} className="flex min-h-10 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
        <CheckCircle2 className={cn("size-4 shrink-0", p.solvedToday ? "text-success" : "text-muted-foreground/30")} aria-label={p.solvedToday ? "Solved today" : "Not solved"} />
        <span className="min-w-0 flex-1 truncate">{p.title}</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{p.pattern}</span>
        <span className={cn("w-14 text-right text-xs font-medium", DIFF_CLASS[p.difficulty])}>{p.difficulty}</span>
      </Link>
    </li>
  );
}

/** The next sheet problem beyond today's plan, and what solving it now does to the calendar. */
export function ProblemOfDayCard({ data }: { data: ProblemOfDay }) {
  const { pick, upNext, impact, todayDsa, paceDelta, mainLeft } = data;

  if (!pick) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 py-6">
          <Trophy className="size-5 text-success" aria-hidden />
          <p className="text-sm">Every sheet problem is solved. Keep your reviews going and try a generated problem below.</p>
        </CardContent>
      </Card>
    );
  }

  const line = impactLine(data);
  return (
    <Card className="mb-6 border-primary/30">
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
              <Sparkles className="size-3.5" aria-hidden /> Problem of the day
            </p>
            <PaceBadge delta={paceDelta} />
            {pick.solvedToday && (
              <ToneBadge tone="success" icon={CheckCircle2}>
                Solved today
              </ToneBadge>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              <Link href={`/dsa/${pick.slug}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                {pick.title}
              </Link>
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className={cn("font-medium", DIFF_CLASS[pick.difficulty])}>{pick.difficulty}</span>
              <span aria-hidden>·</span>
              <span>{pick.pattern}</span>
              {pick.core && (
                <>
                  <span aria-hidden>·</span>
                  <span>Core</span>
                </>
              )}
            </p>
          </div>
          {line && <p className="text-sm">{line}</p>}
          <p className="text-xs text-muted-foreground">
            {todayDsa.target > 0
              ? `It also counts toward today's problems (${todayDsa.solved} of ${todayDsa.target} done). The daily quiz is still what completes the day.`
              : `${mainLeft} sheet problem${mainLeft === 1 ? "" : "s"} left. Every one you solve early comes off a later day.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dsa/${pick.slug}`}>
                {pick.solvedToday ? "Open again" : "Solve now"} <ArrowRight />
              </Link>
            </Button>
            {impact?.scheduledOn && (
              <Button asChild variant="outline">
                <Link href={`/calendar/${impact.scheduledOn}`}>
                  <CalendarDays /> See {formatDate(impact.scheduledOn)}
                </Link>
              </Button>
            )}
          </div>
        </div>
        {upNext.length > 0 && (
          <div className="min-w-0 lg:border-l lg:pl-5">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Got more time? Up next</p>
            <ul>
              {upNext.map((p) => (
                <UpNextRow key={p.slug} p={p} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
