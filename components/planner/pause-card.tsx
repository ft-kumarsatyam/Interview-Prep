"use client";

import { useState, useTransition } from "react";
import { PauseCircle, Play, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { pauseAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import type { FeasibilityStatus } from "@/lib/domain/feasibility";

type Request = { mode: "rest-of-week" } | { mode: "days"; count: number } | { mode: "resume" };

const WARNING: Record<Exclude<FeasibilityStatus, "on-track">, string> = {
  tight: "Time is tight",
  "at-risk": "The plan is at risk",
};

/** Pause or skip days from tomorrow. Paused days are rest days (no targets, the streak is safe), so they take time away from the plan. */
export function PauseCard({ pausedAhead, status, coveragePct }: { pausedAhead: number; status: FeasibilityStatus; coveragePct: number }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function run(label: string, request: Request) {
    setBusy(label);
    start(async () => {
      const res = await pauseAction(request);
      setBusy(null);
      if (!res.ok) return void toast.error(res.error);
      if (res.removed > 0) toast.success(`Resumed. ${res.removed} day${res.removed === 1 ? "" : "s"} back in the plan.`);
      else if (res.added > 0) {
        const msg = `Paused ${res.added} day${res.added === 1 ? "" : "s"}.${res.capped ? " Some were left out: rest days are limited to 60." : ""}`;
        if (res.status === "on-track") toast.success(msg);
        else toast.warning(`${msg} ${WARNING[res.status]} now.`);
      } else toast.info("Nothing to change. Paused days start tomorrow and stay inside the plan.");
    });
  }

  const buttons: Array<{ label: string; request: Request }> = [
    { label: "Skip the rest of this week", request: { mode: "rest-of-week" } },
    { label: "Pause 3 days", request: { mode: "days", count: 3 } },
    { label: "Pause 1 week", request: { mode: "days", count: 7 } },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paused days start tomorrow and are rest days: no targets, and they count as complete so the streak is safe. Today and earlier never change.
        {pausedAhead > 0 && <span className="font-medium text-foreground"> {pausedAhead} paused day{pausedAhead === 1 ? "" : "s"} ahead.</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <Button key={b.label} size="sm" variant="outline" disabled={pending} loading={pending && busy === b.label} onClick={() => run(b.label, b.request)}>
            {!(pending && busy === b.label) && <PauseCircle />} {b.label}
          </Button>
        ))}
        {pausedAhead > 0 && (
          <Button size="sm" variant="secondary" disabled={pending} loading={pending && busy === "Resume"} onClick={() => run("Resume", { mode: "resume" })}>
            {!(pending && busy === "Resume") && <Play />} Resume
          </Button>
        )}
      </div>
      {status !== "on-track" && (
        <p className="flex items-start gap-2 text-sm text-warning" role="status">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {WARNING[status]}: the time left covers about {coveragePct}% of the work. More paused days make it tighter.
        </p>
      )}
    </div>
  );
}
