import Link from "next/link";
import { Check, ChevronRight, Circle, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToneBadge } from "@/components/shared/tone-badge";
import { cn } from "@/core/utils";
import type { Requirement, SecondaryStudyItem } from "@/modules/progress/domain/dashboard-view";
import { HoursToday } from "./hours-today";
import { ProgressRing } from "./progress-ring";
import { REQUIREMENT_ICONS } from "./requirement-icons";

const SECONDARY_BUCKET_LABEL = { recommended: "Recommended", optional: "Optional" } as const;
const SECONDARY_VISIBLE_COUNT = 3;

type Props = {
  description: string;
  requirements: Requirement[];
  next?: Requirement;
  complete: boolean;
  showHours: boolean;
  hours: number | null;
  estMinutes: number | null;
  /** Recommended/optional study-flow items, shown as a lighter tier below the required checklist. */
  secondary?: readonly SecondaryStudyItem[];
};

/** Today's targets as a progress ring plus a tappable checklist. */
export function TodayCard({ description, requirements, next, complete, showHours, hours, estMinutes, secondary = [] }: Props) {
  const visibleSecondary = secondary.slice(0, SECONDARY_VISIBLE_COUNT);
  const doneCount = requirements.filter((r) => r.done).length;
  return (
    <Card className={cn(complete && "border-success/40")}>
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <ProgressRing done={doneCount} total={requirements.length} complete={complete} />
        <div className="w-full min-w-0 space-y-3">
          <ul className="w-full space-y-2">
            {requirements.map((r) => {
              const isNext = r === next;
              const Icon = REQUIREMENT_ICONS[r.icon];
              return (
                <li key={r.label}>
                  <Link
                    href={r.href}
                    className={cn("group flex flex-col gap-1.5 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted", isNext && "border-primary/50 bg-primary/5")}
                  >
                    <span className="flex items-center gap-3">
                      {r.done ? (
                        <Check className="size-4 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Icon className={cn("size-4 shrink-0", isNext ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      )}
                      <span className={cn("flex-1", r.done && "text-muted-foreground line-through")}>{r.label}</span>
                      {isNext && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-medium text-primary">next</span>}
                      <span className="tabular font-mono text-xs">{r.value}</span>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    {r.frac !== undefined && !r.done && <Progress value={Math.min(r.frac, 1) * 100} className="h-1" aria-hidden />}
                    {r.hint && <span className="pl-7 text-xs text-muted-foreground">{r.hint}</span>}
                  </Link>
                </li>
              );
            })}
            {requirements.length === 0 && <li className="text-sm text-muted-foreground">No targets today.</li>}
          </ul>
          {showHours && <HoursToday hours={hours} estMinutes={estMinutes} locked={complete} />}
          {visibleSecondary.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-2xs font-medium text-muted-foreground">Also worth doing today</p>
              <ul className="space-y-1.5">
                {visibleSecondary.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-muted">
                      {item.done ? (
                        <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                      ) : item.locked ? (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className={cn("min-w-0 flex-1 truncate", item.done && "text-muted-foreground line-through")}>{item.title}</span>
                      <ToneBadge tone={item.bucket === "recommended" ? "info" : "neutral"}>{SECONDARY_BUCKET_LABEL[item.bucket]}</ToneBadge>
                      <span className="shrink-0 text-muted-foreground">{item.minutes}m</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
