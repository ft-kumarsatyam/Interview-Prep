"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { gradeWithAiAction, selfGradeAction } from "@/app/(app)/genai-test/actions";
import { Button } from "@/components/ui/button";
import { CRITERIA, RUBRIC_MAX } from "@/modules/genai-test/domain/schemas";

export function GradeWithAiButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await gradeWithAiAction({ id });
          if (!res.ok) toast.error(res.error ?? "Couldn't grade");
        })
      }
    >
      {pending ? "Grading…" : "Grade with AI"}
    </Button>
  );
}

/** Your own 0-4 per criterion, compared against the model answer shown above. */
export function SelfGradeForm({ id, qid, initial }: { id: string; qid: string; initial?: Record<string, number> }) {
  const [scores, setScores] = useState<Record<string, number>>({ ...initial });
  const [pending, start] = useTransition();
  const complete = CRITERIA.every((c) => c.id in scores);
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">Grade yourself against the model answer (0 missing, 4 excellent).</p>
      {CRITERIA.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{c.label}</span>
          <div role="radiogroup" aria-label={c.label} className="flex gap-1">
            {Array.from({ length: RUBRIC_MAX + 1 }, (_, v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={scores[c.id] === v}
                onClick={() => setScores((s) => ({ ...s, [c.id]: v }))}
                className={`size-8 rounded-md border font-mono text-sm tabular focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-10 ${scores[c.id] === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        disabled={pending || !complete}
        onClick={() =>
          start(async () => {
            const res = await selfGradeAction({ id, qid, scores });
            if (res.ok) toast.success("Saved");
            else toast.error(res.error ?? "Couldn't save");
          })
        }
      >
        {pending ? "Saving…" : "Save grade"}
      </Button>
    </div>
  );
}
