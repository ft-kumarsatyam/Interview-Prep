"use client";

import { useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { replanTodayAction } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/domain/time-budget";
import { cn } from "@/lib/utils";

const PRESETS = [1, 2, 3.5, 5, 6];

/** Shows how long today's plan should take and lets you re-plan for the hours you actually have. */
export function HoursToday({ hours, estMinutes, locked }: { hours: number | null; estMinutes: number | null; locked: boolean }) {
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");

  function apply(h: number) {
    start(async () => {
      const res = await replanTodayAction({ hours: h });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Planned for ${h} h: ${res.dsaTarget} problem${res.dsaTarget === 1 ? "" : "s"}, ${res.theoryTarget} subtopic${res.theoryTarget === 1 ? "" : "s"}`);
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{hours !== null ? `${hours} h today` : "Hours today"}</span>
        {estMinutes !== null && <span className="text-muted-foreground">· plan is about {formatDuration(estMinutes)}</span>}
      </p>
      {locked ? (
        <p className="text-xs text-muted-foreground">Today is complete, so the plan is locked.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Plan today for this many hours">
          {PRESETS.map((h) => (
            <Button key={h} type="button" size="sm" variant={hours === h ? "secondary" : "outline"} aria-pressed={hours === h} disabled={pending} onClick={() => apply(h)} className={cn("tabular", hours === h && "ring-1 ring-primary/40")}>
              {h} h
            </Button>
          ))}
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(custom);
              if (custom && Number.isFinite(n)) apply(n);
            }}
          >
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="decimal" placeholder="custom" aria-label="Custom hours" className="h-8 w-20 text-sm" />
            <Button type="submit" size="sm" variant="ghost" disabled={pending || !custom}>
              Set
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
