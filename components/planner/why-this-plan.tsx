import { ChevronDown } from "lucide-react";
import type { DayReason } from "@/lib/domain/explain-day";
import { cn } from "@/lib/utils";

/** A collapsed "Why this plan?" disclosure listing the reasons behind a day. Plain <details>, so it works without JavaScript and by keyboard. */
export function WhyThisPlan({ reasons, className }: { reasons: readonly DayReason[]; className?: string }) {
  if (reasons.length === 0) return null;
  return (
    <details className={cn("group rounded-lg border bg-card text-sm", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        Why this plan?
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ol className="space-y-2.5 border-t px-3 py-3">
        {reasons.map((r) => (
          <li key={r.title}>
            <p className="font-medium">{r.title}</p>
            <p className="text-pretty text-muted-foreground">{r.detail}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
