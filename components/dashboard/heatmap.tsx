import type { HeatCell, HeatState } from "@/lib/domain/heatmap";
import { formatDate } from "@/lib/plan-clock";
import { cn } from "@/lib/utils";

const STATE_CLASS: Record<HeatState, string> = {
  future: "bg-muted/40",
  idle: "bg-muted ring-1 ring-primary/60",
  missed: "bg-muted",
  partial: "bg-warning/60",
  complete: "bg-success",
  freeze: "bg-muted ring-1 ring-chart-5",
};

const STATE_LABEL: Record<HeatState, string> = {
  future: "upcoming",
  idle: "today, in progress",
  missed: "missed",
  partial: "partial",
  complete: "complete",
  freeze: "freeze used",
};

/** Plan window as week columns (Mon → Sun rows). */
export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const count = (s: HeatState) => cells.filter((c) => c.state === s).length;
  const summary = `Activity: ${count("complete")} complete, ${count("partial")} partial, ${count("missed")} missed, ${count("freeze")} freeze days`;
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label={summary}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1" aria-hidden>
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${formatDate(cell.date)} · ${STATE_LABEL[cell.state]} · ${cell.dsaSolved} solved · ${cell.theoryDone} theory`}
                className={cn("size-3 rounded-[3px] sm:size-3.5", STATE_CLASS[cell.state])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(["missed", "partial", "complete", "freeze"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-[3px]", STATE_CLASS[s])} /> {STATE_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
