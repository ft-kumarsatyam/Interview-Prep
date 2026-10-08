"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pause, Play, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateExternalProgressAction } from "@/app/(app)/dsa/actions";
import { saveTimedSolveAction } from "@/app/(app)/dsa/[slug]/actions";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { elapsedSecondsAt, minutesFromSeconds, resetTimer, toggleTimer, type TimerState } from "@/modules/dsa/domain/external-catalogue";

function format(seconds: number): string {
  return `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor((seconds % 3600) / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/** `slug` saves the time as a solve of that local problem; without it the time completes the external sheet item. */
export function ExternalQuestionTimer({ itemId, slug }: { itemId: string; slug?: string }) {
  const storageKey = `prepos:dsa-timer:${itemId}`;
  const [state, setState] = useState<TimerState>({ elapsedSeconds: 0, running: false, startedAt: null });
  const [now, setNow] = useState(() => Date.now());
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const restored = JSON.parse(saved) as TimerState;
        window.setTimeout(() => setState(restored), 0);
      }
    } catch {
      // Local timer state is optional; the server remains the source of truth.
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    if (!state.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state, storageKey]);

  const elapsed = useMemo(() => elapsedSecondsAt(state, now), [state, now]);
  const save = () => {
    startSaving(async () => {
      const minutes = minutesFromSeconds(elapsed);
      const result: ActionResult = slug
        ? await saveTimedSolveAction({ slug, timeTakenMin: minutes })
        : await updateExternalProgressAction({ itemId, status: "completed", timeTakenMin: minutes });
      if (result.ok) toast.success("Question marked complete");
      else toast.error(result.error);
    });
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
      <span className="min-w-16 px-1 font-mono text-xs tabular-nums" aria-label={`${minutesFromSeconds(elapsed)} minutes elapsed`}>{format(elapsed)}</span>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setState((current) => toggleTimer(current, Date.now()))} aria-label={state.running ? "Pause timer" : "Start timer"}>
        {state.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setState(resetTimer)} aria-label="Reset timer"><RotateCcw className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={save} disabled={saving || elapsed === 0} aria-label="Save timed completion"><Save className="size-3.5" /></Button>
    </div>
  );
}
