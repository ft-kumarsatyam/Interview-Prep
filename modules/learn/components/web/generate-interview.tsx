"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateInterviewQuestionsAction } from "@/app/(app)/web/actions";
import { Button } from "@/components/ui/button";
import { INTERVIEW_LEVELS, type InterviewLevel } from "@/modules/learn/domain/web-interview";

/** Ask the model for a few more questions on this track at a level. They are validated, de-duplicated and tracked like the rest. */
export function GenerateInterview({ track }: { track: string }) {
  const [level, setLevel] = useState<InterviewLevel>("mid");
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const res = await generateInterviewQuestionsAction({ track, level });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(`Added ${res.added} new ${level} question${res.added === 1 ? "" : "s"}${res.skippedDuplicates ? ` (${res.skippedDuplicates} repeats skipped)` : ""}.`);
    });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-sm">
      <Sparkles className="size-4 text-primary" aria-hidden />
      <span className="mr-1">Need more?</span>
      <label htmlFor="gen-level" className="sr-only">
        Level
      </label>
      <select id="gen-level" value={level} onChange={(e) => setLevel(e.target.value as InterviewLevel)} className="h-9 rounded-md border bg-background px-2 capitalize">
        {INTERVIEW_LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" onClick={run} disabled={pending}>
        {pending ? "Writing…" : "Add 3 questions with AI"}
      </Button>
    </div>
  );
}
