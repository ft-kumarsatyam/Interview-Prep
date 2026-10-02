"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Code2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seededRng, shuffle } from "@/lib/domain/sampling";
import { playgroundHref } from "@/lib/playground/share";
import type { PublicQuestion, QuizOutcome } from "@/lib/quiz/question";
import { cn } from "@/lib/utils";

export type SubmitFn = (answers: Array<number | null>) => Promise<{ ok: true; outcome: QuizOutcome } | { ok: false; error: string }>;

interface QuizPlayerProps {
  questions: PublicQuestion[];
  /** Server-chosen seed so the shuffle is identical during SSR and hydration. */
  seed: number;
  passPct: number;
  submit: SubmitFn;
  /** Show these results first (e.g. today's quiz was already attempted). */
  initial?: { outcome: QuizOutcome; answers: Array<number | null> } | null;
  /** Replace the default "reshuffle the same questions" retake. */
  onRetake?: () => void;
  retakeLabel?: string;
  /** Extra content under the score (mastery, streak message…). */
  resultExtra?: ReactNode;
}

const LETTERS = ["A", "B", "C", "D"];

/** One question per screen; options and order reshuffle on every run. Keys: 1–4, Enter, ←/→. */
export function QuizPlayer({ questions, seed, passPct, submit, initial, onRetake, retakeLabel = "Retake (reshuffled)", resultExtra }: QuizPlayerProps) {
  const [run, setRun] = useState(0);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => initial?.answers ?? questions.map(() => null));
  const [result, setResult] = useState<QuizOutcome | null>(initial?.outcome ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [announce, setAnnounce] = useState("");

  const layout = useMemo(() => {
    const rng = seededRng(seed + run * 7919);
    const order = shuffle(questions.map((_, i) => i), rng);
    const optionOrder = questions.map((q) => shuffle(q.options.map((_, i) => i), rng));
    return { order, optionOrder };
  }, [questions, seed, run]);

  const qIndex = layout.order[pos];
  const question = questions[qIndex];
  const unanswered = answers.filter((a) => a === null).length;

  const choose = useCallback(
    (displayIdx: number) => {
      const original = layout.optionOrder[qIndex][displayIdx];
      if (original === undefined) return;
      setAnswers((prev) => prev.map((a, i) => (i === qIndex ? original : a)));
      setAnnounce(`Option ${LETTERS[displayIdx]} selected`);
    },
    [layout, qIndex],
  );

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    const res = await submit(answers);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResult(res.outcome);
    setAnnounce(`Scored ${res.outcome.pct} percent. ${res.outcome.passed ? "Passed" : "Not passed yet"}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [answers, submit]);

  const next = useCallback(() => {
    if (pos < questions.length - 1) setPos((p) => p + 1);
    else void doSubmit();
  }, [pos, questions.length, doSubmit]);

  useEffect(() => {
    if (result || submitting) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        choose(Number(e.key) - 1);
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        if (e.key === "Enter" && el?.tagName === "BUTTON") return;
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPos((p) => Math.max(0, p - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, next, result, submitting]);

  function retake() {
    if (onRetake) return onRetake();
    setRun((r) => r + 1);
    setPos(0);
    setAnswers(questions.map(() => null));
    setResult(null);
    setAnnounce("New attempt started");
  }

  const live = (
    <p className="sr-only" aria-live="polite">
      {announce}
    </p>
  );

  if (result) {
    return (
      <div className="space-y-4">
        {live}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
            <ScoreGauge pct={result.pct} passed={result.passed} />
            <div className="flex-1 text-center sm:text-left">
              <p className={cn("text-lg font-semibold", result.passed ? "text-success" : "text-foreground")}>
                {result.passed ? "Passed" : `Not yet: ${passPct}% needed`}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.correct} of {result.total} correct
              </p>
              {resultExtra}
            </div>
            <Button variant="outline" onClick={retake}>
              <RotateCcw /> {retakeLabel}
            </Button>
          </CardContent>
        </Card>
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const review = result.review.find((r) => r.id === q.id);
            const chosen = answers[i];
            const right = review && chosen === review.answerIndex;
            return (
              <li key={q.id}>
                <Card className={cn("border-l-4", right ? "border-l-success" : "border-l-destructive")}>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-start gap-2 font-medium">
                      {right ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" />}
                      <span>
                        {i + 1}. {q.prompt}
                      </span>
                    </p>
                    {q.code && <CodeBlock code={q.code} />}
                    {!right && (
                      <p className="text-muted-foreground">
                        Your answer: <OptionText code={!!q.code}>{chosen === null ? "(skipped)" : q.options[chosen]}</OptionText>
                      </p>
                    )}
                    {review && (
                      <p>
                        Correct: <OptionText code={!!q.code}>{q.options[review.answerIndex]}</OptionText>
                      </p>
                    )}
                    {review?.explanation && <p className="text-muted-foreground">{review.explanation}</p>}
                    {!right && q.code && (
                      <Link href={playgroundHref(q.code)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Code2 className="size-3" /> Run it in the Playground
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const chosenOriginal = answers[qIndex];
  return (
    <div className="space-y-4">
      {live}
      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {layout.order.map((qi, i) => (
          <button
            key={questions[qi].id}
            type="button"
            onClick={() => setPos(i)}
            aria-label={`Question ${i + 1}${answers[qi] !== null ? ", answered" : ""}`}
            aria-current={i === pos ? "step" : undefined}
            className={cn(
              "size-2.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              i === pos ? "bg-primary ring-2 ring-primary/30" : answers[qi] !== null ? "bg-primary/60" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </nav>
      <Card>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Question {pos + 1} of {questions.length}
          </p>
          <h2 className="text-base font-medium">{question.prompt}</h2>
          {question.code && <CodeBlock code={question.code} />}
          <div role="radiogroup" aria-label="Options" className="grid gap-2">
            {layout.optionOrder[qIndex].map((original, displayIdx) => {
              const selected = chosenOriginal === original;
              return (
                <button
                  key={original}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(displayIdx)}
                  className={cn(
                    "flex min-h-12 items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected ? "border-primary bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <kbd className={cn("grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs", selected && "border-primary text-primary")}>
                    {displayIdx + 1}
                  </kbd>
                  <OptionText code={!!question.code}>{question.options[original]}</OptionText>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0}>
          <ArrowLeft /> Back
        </Button>
        <span className="text-xs text-muted-foreground">{unanswered > 0 ? `${unanswered} unanswered (counted wrong)` : "All answered"}</span>
        {pos < questions.length - 1 ? (
          <Button variant="secondary" onClick={next}>
            Next <ArrowRight />
          </Button>
        ) : (
          <Button onClick={() => void doSubmit()} disabled={submitting}>
            {submitting ? "Grading…" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">{code}</pre>;
}

function OptionText({ code, children }: { code: boolean; children: ReactNode }) {
  return <span className={cn("min-w-0 break-words", code && "font-mono text-xs whitespace-pre-wrap")}>{children}</span>;
}

function ScoreGauge({ pct, passed }: { pct: number; passed: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={`Score ${pct}%`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={passed ? "var(--success)" : "var(--primary)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-xl font-semibold tabular-nums">{pct}%</span>
    </div>
  );
}
