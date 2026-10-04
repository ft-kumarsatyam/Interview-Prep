"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { applyRemedyAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import type { Remedy } from "@/modules/planner/domain/feasibility";

const hoursText = (min: number) => `${Math.round((min / 60) * 10) / 10} h`;

/** One-click fixes for a plan that doesn't fit. Each one edits the saved plan and is logged in the plan history. */
export function RemedyActions({ remedies }: { remedies: Remedy[] }) {
  const [pending, start] = useTransition();
  if (remedies.length === 0) return null;

  function apply(r: Extract<Remedy, { kind: "extend-date" | "add-hours" }>) {
    start(async () => {
      const res = await applyRemedyAction(r.kind === "extend-date" ? { kind: r.kind, weeks: r.weeks } : { kind: r.kind, hoursPerWeek: r.hoursPerWeek });
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  return (
    <section aria-label="Fix the plan" className="space-y-2 rounded-lg border border-dashed p-3">
      <p className="text-sm font-medium">Fix it in one click</p>
      <ul className="space-y-2">
        {remedies.map((r) => (
          <li key={r.kind} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 text-muted-foreground">
              {r.kind === "extend-date" && `Move the interview date about ${r.weeks} week${r.weeks === 1 ? "" : "s"} later.`}
              {r.kind === "add-hours" && `Study about ${r.hoursPerWeek} more hours a week, spread over your study days.`}
              {r.kind === "drop-nice" && `Skip the nice-to-have topics (${r.subtopics} subtopics, about ${hoursText(r.minutes)})${r.resolves ? "" : ". Helps, but isn't enough alone"}.`}
            </span>
            {r.kind === "drop-nice" ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/plan/setup">Review topics</Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => apply(r)}>
                {r.kind === "extend-date" ? "Move the date" : "Add the hours"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
