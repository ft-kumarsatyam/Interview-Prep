"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { confirmLessonSubtopicAction, setCourseLessonDoneAction } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import { checkScore } from "@/modules/learn/domain/webdev";

interface Q {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface ConfirmTarget {
  id: string;
  title: string;
  topicTitle: string;
  done: boolean;
}

/** Three-question check, then mark the lesson done. Practice, not a test: the answers ship with the page. */
export function CourseCheck({ courseId, lessonId, check, done, subtopic }: { courseId: string; lessonId: string; check: Q[]; done: boolean; subtopic?: ConfirmTarget | null }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => check.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [isDone, setDone] = useState(done);
  const [ticked, setTicked] = useState(subtopic?.done ?? false);
  const [pending, start] = useTransition();
  const score = checkScore(check, picked);

  const finish = (value: boolean) =>
    start(async () => {
      const res = await setCourseLessonDoneAction({ courseId, lessonId, done: value, score: value && revealed ? score.pct : null });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setDone(value);
      toast.success(value ? "Lesson marked done" : "Marked as not done");
    });

  const confirm = () =>
    start(async () => {
      const res = await confirmLessonSubtopicAction({ courseId, lessonId });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setTicked(true);
      toast.success(res.already ? "Already in your plan" : "Ticked in your plan");
    });

  return (
    <section aria-label="Check yourself" className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-base font-semibold">Check yourself</h2>
      <ol className="space-y-4">
        {check.map((c, qi) => (
          <li key={qi} className="space-y-2">
            <p className="text-sm font-medium">
              {qi + 1}. {c.q}
            </p>
            <div role="radiogroup" aria-label={c.q} className="space-y-1.5">
              {c.options.map((o, oi) => {
                const chosen = picked[qi] === oi;
                const right = revealed && oi === c.answer;
                const wrong = revealed && chosen && oi !== c.answer;
                return (
                  <label key={oi} className={`flex min-h-9 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm pointer-coarse:min-h-11 ${right ? "border-success/50 bg-success/10" : wrong ? "border-destructive/50 bg-destructive/10" : chosen ? "border-primary/40 bg-primary/5" : ""}`}>
                    <input type="radio" name={`q${qi}`} className="mt-1" checked={chosen} disabled={revealed} onChange={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))} />
                    <span className="flex-1">{o}</span>
                    {right && <Check className="mt-0.5 size-4 text-success" aria-label="Correct" />}
                    {wrong && <X className="mt-0.5 size-4 text-destructive" aria-label="Wrong" />}
                  </label>
                );
              })}
            </div>
            {revealed && <p className="text-xs text-muted-foreground">{c.why}</p>}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {!revealed ? (
          <Button variant="outline" onClick={() => setRevealed(true)} disabled={picked.some((p) => p === null)}>
            Check answers
          </Button>
        ) : (
          <span className="text-sm font-medium" role="status">
            {score.correct} of {score.total} correct
          </span>
        )}
        <Button onClick={() => finish(!isDone)} loading={pending} variant={isDone ? "outline" : "default"}>
          {isDone ? "Mark as not done" : "Mark lesson done"}
        </Button>
      </div>
      {isDone && subtopic && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          {ticked ? (
            <p className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden /> <span><strong>{subtopic.title}</strong> is ticked in your plan.</span>
            </p>
          ) : (
            <div className="space-y-2">
              <p>
                This lesson teaches <strong>{subtopic.title}</strong> ({subtopic.topicTitle}). Mark it done in your plan too? It then counts toward today&apos;s theory. Reading alone doesn&apos;t.
              </p>
              <Button size="sm" onClick={confirm} loading={pending}>
                Yes, mark it done
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
