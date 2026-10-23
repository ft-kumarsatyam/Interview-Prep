"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveReviewAction } from "@/app/(app)/genai-playbook/actions";
import { Button } from "@/components/ui/button";

export interface ScoreField {
  id: string;
  label: string;
}

/** A row of 0-5 (or 1-5) score buttons per field, saved as one review for a week. */
export function ReviewForm({
  kind,
  weekId,
  fields,
  min,
  initial,
  initialNote,
  levels,
}: {
  kind: "readiness" | "mock";
  weekId: string;
  fields: readonly ScoreField[];
  min: 0 | 1;
  initial: Readonly<Record<string, number>>;
  initialNote: string;
  levels?: readonly string[];
}) {
  const [scores, setScores] = useState<Record<string, number>>({ ...initial });
  const [note, setNote] = useState(initialNote);
  const [pending, start] = useTransition();
  const values = Array.from({ length: 6 - min }, (_, i) => i + min);
  const complete = fields.every((f) => f.id in scores);

  const save = () =>
    start(async () => {
      const res = await saveReviewAction({ kind, weekId, scores, note });
      if (res.ok) toast.success("Saved");
      else toast.error(res.error ?? "Couldn't save");
    });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {fields.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{f.label}</span>
            <div role="radiogroup" aria-label={f.label} className="flex gap-1">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={scores[f.id] === v}
                  title={levels?.[v]}
                  onClick={() => setScores((s) => ({ ...s, [f.id]: v }))}
                  className={`size-8 rounded-md border font-mono text-sm tabular focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-10 ${scores[f.id] === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Note (gaps, what to redo)</span>
        <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-md border bg-background p-2 text-sm" />
      </label>
      <Button type="button" size="sm" disabled={pending || !complete} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
