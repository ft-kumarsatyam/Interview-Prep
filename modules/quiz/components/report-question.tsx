"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { flagQuestionAction } from "@/app/(app)/practice/actions";
import { FLAG_REASONS } from "@/modules/quiz/lib/flag-reasons";

const LABEL: Record<(typeof FLAG_REASONS)[number], string> = { "wrong-answer": "Answer looks wrong", unclear: "Unclear wording", outdated: "Out of date", other: "Something else" };

/** "Report a problem" for one question. A reported question is left out of your future quizzes. */
export function ReportQuestion({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) return <p className="text-xs text-muted-foreground">Reported. You won&apos;t see this question again.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-6 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Flag className="size-3.5" aria-hidden /> Report a problem
      </button>
    );
  }
  return (
    <div role="group" aria-label="What is wrong with this question?" className="flex flex-wrap gap-1.5">
      {FLAG_REASONS.map((reason) => (
        <button
          key={reason}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await flagQuestionAction({ qid: questionId, reason });
              if (!res.ok) return void toast.error(`${res.error}.`);
              setDone(true);
            })
          }
          className="min-h-8 rounded-md border px-2 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {LABEL[reason]}
        </button>
      ))}
    </div>
  );
}
