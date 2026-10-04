import { Progress } from "@/components/ui/progress";
import { cn } from "@/core/utils";

export const pctOf = (done: number, total: number) => Math.round((100 * done) / Math.max(1, total));

export function CoverageList({ rows }: { rows: Array<{ key: string; label: string; done: number; total: number; pct: number }> }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1.5">
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {r.done}/{r.total} · <span className={cn(r.pct === 100 && "text-success")}>{r.pct}%</span>
            </span>
          </div>
          <Progress value={r.pct} aria-label={`${r.label}: ${r.pct}% done`} />
        </li>
      ))}
    </ul>
  );
}
