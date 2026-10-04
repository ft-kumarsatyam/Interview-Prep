import { CheckCircle2, CircleHelp, TriangleAlert, XCircle } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { SloResult, SloStatus } from "@/core/domain/slo";
import { cn } from "@/core/utils";

const ICON = { ok: CheckCircle2, warn: TriangleAlert, bad: XCircle, unknown: CircleHelp } as const;
const TONE = { ok: "text-success", warn: "text-warning", bad: "text-destructive", unknown: "text-muted-foreground" } as const;
const WORDS: Record<SloStatus, string> = { ok: "All within target", warn: "Needs a look", bad: "Out of target", unknown: "Not enough data yet" };

/** The service-level objectives, one row each. Colour is never the only signal: every row has an icon and a word. */
export function HealthPanel({ results, overall }: { results: SloResult[]; overall: SloStatus }) {
  const OverallIcon = ICON[overall];
  return (
    <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">System health</h2>
        <ToneBadge tone={overall === "ok" ? "success" : overall === "bad" ? "danger" : overall === "warn" ? "warning" : "neutral"} icon={OverallIcon}>
          {WORDS[overall]}
        </ToneBadge>
      </div>
      <ul className="mt-3 divide-y text-sm">
        {results.map((r) => {
          const Icon = ICON[r.status];
          return (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
              <span className="inline-flex items-center gap-2">
                <Icon className={cn("size-4 shrink-0", TONE[r.status])} aria-hidden />
                <span>{r.label}</span>
                <span className="sr-only">{WORDS[r.status]}</span>
              </span>
              <span className="text-right text-muted-foreground">
                <span className="font-mono tabular-nums text-foreground">{r.value}</span>
                <span className="ml-2 text-xs">target {r.target}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
