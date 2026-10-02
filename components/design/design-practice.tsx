"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { addDesignMinutesAction, saveDesignRubricAction, saveDesignSectionAction } from "@/app/(app)/design/actions";
import { MarkdownNotes } from "@/components/shared/markdown-notes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DESIGN_SECTIONS, PRACTICE_MINUTES, formatClock, rubricScore, type DesignSectionId } from "@/lib/domain/design";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  sections: Record<DesignSectionId, string>;
  rubric: Array<{ id: string; label: string }>;
  checked: string[];
  minutesSpent: number;
}

/** Which section the clock says you should be on, from the per-section budgets. */
function sectionAt(elapsedSeconds: number): DesignSectionId | null {
  let t = 0;
  for (const s of DESIGN_SECTIONS) {
    t += s.minutes * 60;
    if (elapsedSeconds < t) return s.id;
  }
  return null;
}

export function DesignPractice({ slug, sections, rubric, checked: initialChecked, minutesSpent: initialMinutes }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minutesSpent, setMinutesSpent] = useState(initialMinutes);
  const [checked, setChecked] = useState(initialChecked);
  const [, start] = useTransition();
  const segmentStart = useRef<number | null>(null);
  const banked = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (segmentStart.current !== null) setElapsed(banked.current + Math.floor((Date.now() - segmentStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  function startTimer() {
    segmentStart.current = Date.now();
    setRunning(true);
  }

  function pauseTimer() {
    if (segmentStart.current === null) return;
    const seconds = Math.floor((Date.now() - segmentStart.current) / 1000);
    banked.current += seconds;
    segmentStart.current = null;
    setElapsed(banked.current);
    setRunning(false);
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return;
    start(async () => {
      const res = await addDesignMinutesAction({ slug, minutes });
      if (res.ok) setMinutesSpent(res.minutesSpent);
      else toast.error(res.error);
    });
  }

  function resetTimer() {
    if (running) pauseTimer();
    banked.current = 0;
    setElapsed(0);
  }

  function toggle(id: string, on: boolean) {
    const next = on ? [...checked, id] : checked.filter((x) => x !== id);
    setChecked(next);
    start(async () => {
      const res = await saveDesignRubricAction({ slug, checked: next });
      if (!res.ok) toast.error(res.error);
    });
  }

  const remaining = PRACTICE_MINUTES * 60 - elapsed;
  const current = elapsed > 0 ? sectionAt(elapsed) : null;
  const score = rubricScore(checked, rubric.map((r) => r.id));

  return (
    <div className="space-y-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 flex flex-wrap items-center gap-3 border-y bg-background/95 px-4 py-3 backdrop-blur lg:mx-0 lg:rounded-xl lg:border">
        <div className={cn("font-mono text-2xl font-semibold tabular", remaining < 0 && "text-destructive")} aria-live="off">
          {formatClock(remaining)}
        </div>
        <div className="min-w-0 flex-1 text-sm text-muted-foreground">
          {current ? (
            <>
              Now: <span className="font-medium text-foreground">{DESIGN_SECTIONS.find((s) => s.id === current)?.label}</span>
            </>
          ) : remaining < 0 ? (
            "Over time. Wrap up with trade-offs."
          ) : (
            `${PRACTICE_MINUTES}-minute mock round. Total practice so far: ${minutesSpent} min.`
          )}
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button size="sm" variant="outline" onClick={pauseTimer}>
              <Pause /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={startTimer}>
              <Play /> {elapsed ? "Resume" : "Start timer"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={resetTimer} disabled={!elapsed} aria-label="Reset timer">
            <RotateCcw />
          </Button>
        </div>
      </div>

      <ol className="space-y-5">
        {DESIGN_SECTIONS.map((s, i) => (
          <li key={s.id} className={cn("rounded-xl border p-4 transition-colors", current === s.id && "border-primary/60 bg-primary/5")}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-medium">
                {i + 1}. {s.label}
              </h3>
              <span className="shrink-0 text-xs text-muted-foreground">{s.minutes} min</span>
            </div>
            <MarkdownNotes
              compact
              initial={sections[s.id]}
              placeholder={s.hint}
              onSave={(text) => saveDesignSectionAction({ slug, section: s.id, text })}
            />
          </li>
        ))}
      </ol>

      <section aria-labelledby="rubric" className="rounded-xl border p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 id="rubric" className="font-medium">
            Self-review rubric
          </h3>
          <span className="text-sm text-muted-foreground">
            {score.done}/{score.total}
          </span>
        </div>
        <Progress value={score.pct} aria-label="Rubric score" className="mb-4" />
        <ul className="space-y-2.5">
          {rubric.map((r) => (
            <li key={r.id} className="flex items-start gap-2.5">
              <Checkbox id={`rubric-${r.id}`} checked={checked.includes(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} className="mt-0.5" />
              <label htmlFor={`rubric-${r.id}`} className="text-sm leading-snug">
                {r.label}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
