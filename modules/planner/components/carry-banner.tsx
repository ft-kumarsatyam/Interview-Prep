"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { snoozeOptionalAction } from "@/app/(app)/backlog/actions";
import { replanTodayAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { CarryStatus } from "@/modules/planner/domain/carry-limits";

/**
 * Shown when unfinished work pushed forward passes your limits. It warns and offers fixes; it never blocks.
 * The interview date is not one of the fixes.
 */
export function CarryBanner({ status, hours, maxHours, today }: { status: CarryStatus; hours: number | null; maxHours: number; today: string }) {
  const key = `carry-banner:${today}:${status.level}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(`prepos:${key}`) === "1";
    } catch {
      return false;
    }
  });
  const [pending, start] = useTransition();
  if (status.level === "ok" || hidden) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(`prepos:${key}`, "1");
    } catch {
      /* storage blocked: it just comes back on reload */
    }
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(`${res.error ?? "Something went wrong"}.`);
      else toast.success(ok);
    });

  return (
    <section aria-label="Carried-over work" className={`rounded-xl border p-4 ${status.level === "over" ? "border-day-missed-line bg-day-missed" : "border-day-left-line bg-day-left"}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="size-4" aria-hidden /> {status.level === "over" ? "A lot of work has been pushed forward" : "Work is piling up"}
      </h2>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm">
        {status.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted-foreground">Nothing is lost: unfinished work moves to the next days and the plan is rebalanced to your interview date. Pick a fix, or keep going.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status.remedies.map((r) => {
          if (r.kind === "extend-hours")
            return (
              <Button key={r.kind} size="sm" variant="outline" disabled={pending || hours === null || hours >= maxHours} onClick={() => run(() => replanTodayAction({ hours: Math.min(maxHours, (hours ?? 3) + 1) }), "Today's plan now has an extra hour")}>
                {r.label}
              </Button>
            );
          if (r.kind === "weekend-hours")
            return (
              <Button key={r.kind} size="sm" variant="outline" asChild>
                <Link href="/plan">{r.label}</Link>
              </Button>
            );
          if (r.kind === "snooze-optional")
            return (
              <Button key={r.kind} size="sm" variant="outline" disabled={pending} onClick={() => run(async () => snoozeOptionalAction(), "Optional items paused for a week")}>
                {r.label}
              </Button>
            );
          return (
            <Button key={r.kind} size="sm" variant="ghost" onClick={hide}>
              {r.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
