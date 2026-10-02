import { cn } from "@/lib/utils";

/** Share of today's requirements done. Violet → pink gradient, green when complete. */
export function ProgressRing({ done, total, complete }: { done: number; total: number; complete: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = total === 0 ? (complete ? 1 : 0) : done / total;
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`${done} of ${total} requirements done`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--chart-4)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={complete ? "var(--success)" : "url(#ring-gradient)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={cn("tabular font-mono text-3xl font-semibold", complete && "text-success")}>
            {total === 0 ? "—" : `${done}/${total}`}
          </p>
          <p className="text-xs text-muted-foreground">{complete ? "complete" : total === 0 ? "free day" : "today"}</p>
        </div>
      </div>
    </div>
  );
}
