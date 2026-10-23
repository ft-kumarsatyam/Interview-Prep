"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveDraftAction, submitTestAction } from "@/app/(app)/genai-test/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { ANSWER_MAX_CHARS } from "@/modules/genai-test/domain/schemas";
import type { TakeView } from "@/modules/genai-test/domain/views";

const AUTOSAVE_MS = 1500;

export function TestRunner({ view }: { view: TakeView }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number | string>>(view.answers);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  }, [answers]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const change = (id: string, value: number | string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await saveDraftAction({ id: view.id, answers: latest.current });
      setSaved(res.ok);
    }, AUTOSAVE_MS);
  };

  const answered = view.items.filter((i) => (i.kind === "mcq" ? typeof answers[i.id] === "number" : typeof answers[i.id] === "string" && String(answers[i.id]).trim())).length;

  const submit = () =>
    start(async () => {
      if (timer.current) clearTimeout(timer.current);
      const res = await submitTestAction({ id: view.id, answers });
      if (res.ok) {
        if (res.aiUnavailable) toast.message("AI grading isn't available, so grade your written answers yourself on the results page.");
        router.replace(`/genai-test/${view.id}`);
      } else toast.error(res.error);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {answered}/{view.items.length} answered · pass mark {view.passMark}%
        </span>
        <span aria-live="polite">{saved ? "Draft saved" : "Saving…"}</span>
      </div>
      <ol className="space-y-5">
        {view.items.map((item, i) => (
          <li key={item.id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono tabular">Q{i + 1}</span>
              <ToneBadge tone="neutral">{item.kind === "mcq" ? "MCQ" : "Written"}</ToneBadge>
              <span>Level {item.level}</span>
              {item.review && <ToneBadge tone="info">Review</ToneBadge>}
              {item.ahead && <ToneBadge tone="warning">Ahead of your progress</ToneBadge>}
            </div>
            <p className="text-sm font-medium">{item.q}</p>
            {item.kind === "mcq" ? (
              <div role="radiogroup" aria-label={`Question ${i + 1}`} className="space-y-2">
                {item.options?.map((o, k) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${answers[item.id] === k ? "border-primary bg-muted" : "hover:bg-muted"}`}>
                    <input type="radio" name={item.id} checked={answers[item.id] === k} onChange={() => change(item.id, k)} className="mt-1" />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ) : (
              <label className="block space-y-1 text-sm">
                <span className="sr-only">Your answer to question {i + 1}</span>
                <textarea
                  rows={6}
                  maxLength={ANSWER_MAX_CHARS}
                  value={typeof answers[item.id] === "string" ? String(answers[item.id]) : ""}
                  onChange={(e) => change(item.id, e.target.value)}
                  placeholder="Answer as you would in an interview: define it, explain how it works, then give a trade-off or example."
                  className="w-full rounded-md border bg-background p-2 text-sm"
                />
              </label>
            )}
          </li>
        ))}
      </ol>
      <Button type="button" disabled={pending || answered === 0} onClick={submit}>
        {pending ? "Submitting…" : "Submit test"}
      </Button>
    </div>
  );
}
