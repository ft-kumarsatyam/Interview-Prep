import { cn } from "@/core/utils";
import { LEVELS, type Level, type LevelProgress } from "@/modules/dsa/domain/practice-table";

const LEVEL_BAR: Record<Level, string> = { Basic: "bg-success", Core: "bg-warning", Pro: "bg-destructive" };
const LEVEL_BADGE: Record<Level, string> = { Basic: "bg-success/10 text-success", Core: "bg-warning/10 text-warning", Pro: "bg-destructive/10 text-destructive" };

export function LevelBadge({ level }: { level: Level }) {
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", LEVEL_BADGE[level])}>{level}</span>;
}

const pct = (n: number, d: number) => Math.round((n / Math.max(d, 1)) * 100);

/** The "Your progress" card: overall percentage and a bar per level. */
export function DsaProgressCard({ progress, footer }: { progress: LevelProgress; footer?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground">Your progress</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="tabular font-mono text-3xl font-semibold">{pct(progress.solved, progress.total)}%</span>
        <span className="tabular text-sm text-muted-foreground">
          {progress.solved} / {progress.total} problems solved
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct(progress.solved, progress.total)}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {LEVELS.map((level) => {
          const { solved, total } = progress.byLevel[level];
          return (
            <li key={level}>
              <p className="text-xs text-muted-foreground">{level}</p>
              <p className="tabular font-mono text-sm">
                {solved} <span className="text-muted-foreground">/ {total}</span>
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${level} progress`} aria-valuenow={pct(solved, total)} aria-valuemin={0} aria-valuemax={100}>
                <span className={cn("block h-full rounded-full", LEVEL_BAR[level])} style={{ width: `${pct(solved, total)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {footer && <div className="mt-3 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}
