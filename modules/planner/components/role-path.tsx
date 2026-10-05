import { cn } from "@/core/utils";
import { MAX_PLAN_WEEK, type PathPhaseView } from "@/modules/planner/domain/role-path";

export interface RoleOption {
  id: string;
  title: string;
  blurb: string;
  audience: string;
  path: PathPhaseView[];
}

const BAR: Record<string, string> = {
  language: "bg-yellow-500/70",
  dsa: "bg-orange-500/70",
  backend: "bg-lime-500/70",
  db: "bg-emerald-500/70",
  oop: "bg-violet-500/70",
  lld: "bg-indigo-500/70",
  hld: "bg-blue-500/70",
  cs: "bg-amber-500/70",
  ai: "bg-pink-500/70",
  behavioral: "bg-slate-500/70",
};

/** A role as ordered phases. Lanes inside a phase run side by side; each bar shows the weeks a lane covers. */
export function RolePath({ path, className }: { path: PathPhaseView[]; className?: string }) {
  return (
    <ol className={cn("space-y-4", className)}>
      {path.map((phase, i) => (
        <li key={phase.title} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-sm font-medium">
              <span className="mr-2 text-muted-foreground">{i + 1}.</span>
              {phase.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Weeks {phase.fromWeek}-{phase.toWeek}
            </p>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{phase.outcome}</p>
          <ul className="space-y-1.5">
            {phase.lanes.map((lane) => (
              <li key={lane.label} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-xs sm:grid-cols-[11rem_1fr]">
                <span className="truncate" title={lane.label}>
                  {lane.label} <span className="text-muted-foreground">· {lane.topicCount}</span>
                </span>
                <span className="relative h-2.5 rounded-full bg-muted" role="img" aria-label={`${lane.label}: weeks ${lane.fromWeek} to ${lane.toWeek}`}>
                  <span
                    className={cn("absolute inset-y-0 rounded-full", BAR[lane.kind])}
                    style={{ left: `${((lane.fromWeek - 1) / MAX_PLAN_WEEK) * 100}%`, width: `${((lane.toWeek - lane.fromWeek + 1) / MAX_PLAN_WEEK) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
