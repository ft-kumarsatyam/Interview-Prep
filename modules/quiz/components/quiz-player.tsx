"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CircleSlash, Keyboard, ListFilter, PartyPopper, RotateCcw, Send, Target, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chosenIndices, correctIndices, isAnswerCorrect } from "@/modules/quiz/domain/quiz";
import { seededRng, shuffle } from "@/core/domain/sampling";
import type { PublicQuestion, QuizOutcome } from "@/modules/quiz/lib/question";
import { cn } from "@/core/utils";
import { OptionText, QuestionReview, QuizCode } from "@/modules/quiz/components/question-review";

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
  /** Next-step buttons shown next to Retake on the results card. */
  resultActions?: ReactNode;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One question per screen; options and order reshuffle on every run (true/false keeps its order). Keys: 1–6, Enter, ←/→. */
export function QuizPlayer({ questions, seed, passPct, submit, initial, onRetake, retakeLabel = "Retake (reshuffled)", resultExtra, resultActions }: QuizPlayerProps) {
  const [run, setRun] = useState(0);
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => initial?.answers ?? questions.map(() => null));
  const [result, setResult] = useState<QuizOutcome | null>(initial?.outcome ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);
  const [announce, setAnnounce] = useState("");
  const submittingRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const layout = useMemo(() => {
    const rng = seededRng(seed + run * 7919);
    const order = shuffle(questions.map((_, i) => i), rng);
    // The rng is consumed per question either way, so adding a true/false question never reshuffles the others.
    const optionOrder = questions.map((q) => {
      const shuffled = shuffle(q.options.map((_, i) => i), rng);
      return q.type === "truefalse" ? q.options.map((_, i) => i) : shuffled;
    });
    return { order, optionOrder };
  }, [questions, seed, run]);

  const qIndex = layout.order[pos];
  const question = questions[qIndex];
  const unanswered = answers.filter((a) => a === null).length;
  const answeredCount = questions.length - unanswered;
  const isLast = pos === questions.length - 1;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [pos, result]);

  const choose = useCallback(
    (displayIdx: number) => {
      const original = layout.optionOrder[qIndex][displayIdx];
      if (original === undefined) return;
      if (questions[qIndex].type === "multi") {
        // Multi-select answers are a bitmask over the original option indices; an empty selection is "unanswered".
        setAnswers((prev) =>
          prev.map((a, i) => {
            if (i !== qIndex) return a;
            const next = (a ?? 0) ^ (1 << original);
            return next === 0 ? null : next;
          }),
        );
        setAnnounce(`Option ${LETTERS[displayIdx]} toggled`);
        return;
      }
      setAnswers((prev) => prev.map((a, i) => (i === qIndex ? original : a)));
      setAnnounce(`Option ${LETTERS[displayIdx]} selected`);
    },
    [layout, qIndex, questions],
  );

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setSubmitting(true);
    setAnnounce("Grading your answers");
    try {
      const res = await submit(answers);
      if (!res.ok) {
        toast.error(res.error);
        setAnnounce(`Couldn't submit: ${res.error}`);
        return;
      }
      setResult(res.outcome);
      setWrongOnly(false);
      setAnnounce(`Scored ${res.outcome.pct} percent, ${res.outcome.correct} of ${res.outcome.total} correct. ${res.outcome.passed ? "Passed" : "Not passed yet"}.`);
    } catch {
      toast.error("Couldn't submit, check your connection and try again");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, submit]);

  const requestSubmit = useCallback(() => {
    if (submittingRef.current) return;
    if (unanswered > 0) setConfirmOpen(true);
    else void doSubmit();
  }, [unanswered, doSubmit]);

  const next = useCallback(() => {
    if (!isLast) setPos((p) => p + 1);
    else requestSubmit();
  }, [isLast, requestSubmit]);

  const goToFirstUnanswered = () => {
    const i = layout.order.findIndex((qi) => answers[qi] === null);
    setConfirmOpen(false);
    if (i >= 0) setPos(i);
  };

  useEffect(() => {
    if (result || submitting || confirmOpen) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-6]$/.test(e.key)) {
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
  }, [choose, next, result, submitting, confirmOpen]);

  function retake() {
    if (onRetake) return onRetake();
    setRun((r) => r + 1);
    setPos(0);
    setAnswers(questions.map(() => null));
    setResult(null);
    setAnnounce("New attempt started, question 1");
  }

  const live = (
    <p className="sr-only" aria-live="polite" role="status">
      {announce}
    </p>
  );

  if (result) {
    const graded = questions.map((q, i) => {
      const review = result.review.find((r) => r.id === q.id);
      const chosen = answers[i];
      return { q, i, review, chosen, right: !!review && isAnswerCorrect(review, chosen), skipped: chosen === null };
    });
    const wrongCount = graded.filter((g) => !g.right).length;
    const skippedCount = graded.filter((g) => g.skipped && !g.right).length;
    const shown = wrongOnly ? graded.filter((g) => !g.right) : graded;
    return (
      <div ref={topRef} className="scroll-mt-20 space-y-5">
        {live}
        <Card className={cn(result.passed && "bg-success/5 ring-success/30")}>
          <CardContent className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
            <ScoreGauge pct={result.pct} passed={result.passed} passPct={passPct} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className={cn("flex items-center justify-center gap-2 text-xl font-semibold sm:justify-start", result.passed ? "text-success" : "text-foreground")}>
                {result.passed ? <Trophy className="size-5" aria-hidden /> : <Target className="size-5 text-primary" aria-hidden />}
                {result.passed ? (result.pct === 100 ? "Perfect score!" : "Passed!") : "Not passed yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.correct} of {result.total} correct · pass mark {passPct}%
                {!result.passed && ` · ${Math.max(0, Math.ceil((passPct / 100) * result.total) - result.correct)} more correct needed`}
              </p>
              <ul className="flex flex-wrap justify-center gap-2 text-xs sm:justify-start" aria-label="Breakdown">
                <Chip className="bg-success/10 text-success">
                  <Check className="size-3.5" aria-hidden /> {result.correct} correct
                </Chip>
                {wrongCount - skippedCount > 0 && (
                  <Chip className="bg-destructive/10 text-destructive">
                    <X className="size-3.5" aria-hidden /> {wrongCount - skippedCount} wrong
                  </Chip>
                )}
                {skippedCount > 0 && (
                  <Chip className="bg-warning/10 text-warning">
                    <CircleSlash className="size-3.5" aria-hidden /> {skippedCount} skipped
                  </Chip>
                )}
              </ul>
              {resultExtra}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0">
              <Button variant={result.passed ? "outline" : "default"} size="lg" className="h-10 px-4" onClick={retake}>
                <RotateCcw /> {retakeLabel}
              </Button>
              {resultActions}
            </div>
          </CardContent>
        </Card>

        <SectionHeading className="mb-0" title="Review answers" action={
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Filter questions">
            <FilterButton pressed={!wrongOnly} onClick={() => setWrongOnly(false)}>
              All ({graded.length})
            </FilterButton>
            <FilterButton pressed={wrongOnly} onClick={() => setWrongOnly(true)} disabled={wrongCount === 0}>
              <ListFilter className="size-3.5" aria-hidden /> Wrong only ({wrongCount})
            </FilterButton>
          </div>
        } />

        {shown.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-success">
            <PartyPopper className="size-4" aria-hidden /> Nothing wrong to review.
          </p>
        ) : (
          <ol className="space-y-3">
            {shown.map(({ q, i, review, chosen, right }) => (
              <li key={q.id}>
                <QuestionReview
                  number={i + 1}
                  prompt={q.prompt}
                  code={q.code}
                  options={q.options}
                  multi={review?.type === "multi"}
                  chosen={review ? chosenIndices(review, chosen, q.options.length) : []}
                  correct={review ? correctIndices(review) : []}
                  right={right}
                  explanation={review?.explanation}
                  subject={review?.subject}
                  learnMore={review?.learnMore}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  const chosenOriginal = answers[qIndex];
  const isMulti = question.type === "multi";
  const keyCount = Math.min(6, question.options.length);
  return (
    <div ref={topRef} className="scroll-mt-20 space-y-4">
      {live}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p className="font-medium">
            Question <span className="font-mono tabular-nums">{pos + 1}</span>
            <span className="text-muted-foreground"> of {questions.length}</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${((pos + 1) / questions.length) * 100}%` }} />
        </div>
        <nav aria-label="Jump to question" className="-mx-1 flex flex-wrap">
          {layout.order.map((qi, i) => {
            const done = answers[qi] !== null;
            return (
              <button
                key={questions[qi].id}
                type="button"
                onClick={() => setPos(i)}
                disabled={submitting}
                aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}`}
                aria-current={i === pos ? "step" : undefined}
                className="group grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block size-2.5 rounded-full transition-all group-hover:scale-125",
                    i === pos ? "w-5 bg-primary" : done ? "bg-primary/60" : "border border-muted-foreground/50 bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </nav>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base leading-relaxed font-medium break-words sm:text-lg">{question.prompt}</h2>
          {question.code && <QuizCode code={question.code} />}
          {isMulti && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              Select all that apply. Every correct option, and only those, is needed for credit.
            </p>
          )}
          <div role={isMulti ? "group" : "radiogroup"} aria-label={isMulti ? "Options, select all that apply" : "Options"} className="grid gap-2.5">
            {layout.optionOrder[qIndex].map((original, displayIdx) => {
              const selected = isMulti ? ((chosenOriginal ?? 0) & (1 << original)) !== 0 : chosenOriginal === original;
              return (
                <button
                  key={original}
                  type="button"
                  role={isMulti ? "checkbox" : "radio"}
                  aria-checked={selected}
                  disabled={submitting}
                  onClick={() => choose(displayIdx)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.99] disabled:opacity-60 sm:px-4",
                    selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/60",
                  )}
                >
                  <kbd
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-md border font-mono text-xs transition-colors",
                      selected ? "border-primary bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {displayIdx < 6 ? displayIdx + 1 : LETTERS[displayIdx]}
                  </kbd>
                  <span className="min-w-0 flex-1">
                    <OptionText code={!!question.code}>{question.options[original]}</OptionText>
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center border-2 transition-colors",
                      isMulti ? "rounded-md" : "rounded-full",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                    aria-hidden
                  >
                    {selected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <Keyboard className="size-3.5" aria-hidden />
        <Kbd>1</Kbd>–<Kbd>{keyCount}</Kbd> {isMulti ? "toggle" : "pick"} · <Kbd>Enter</Kbd> {isLast ? "submit" : "next"} · <Kbd>←</Kbd>
        <Kbd>→</Kbd> move
      </p>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-2 rounded-xl border bg-card/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:bottom-4">
        <Button variant="ghost" size="lg" className="h-10 px-3" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0 || submitting}>
          <ArrowLeft /> <span className="hidden min-[400px]:inline">Back</span>
          <span className="sr-only min-[400px]:hidden">Back</span>
        </Button>
        <span className={cn("min-w-0 truncate text-center text-xs", unanswered > 0 ? "text-muted-foreground" : "text-success")}>
          {unanswered > 0 ? `${unanswered} unanswered` : "All answered"}
        </span>
        {isLast ? (
          <Button size="lg" className="h-10 px-4" onClick={requestSubmit} loading={submitting}>
            {!submitting && <Send />} {submitting ? "Grading…" : "Submit"}
          </Button>
        ) : (
          <Button size="lg" variant={chosenOriginal === null ? "secondary" : "default"} className="h-10 px-4" onClick={next} disabled={submitting}>
            Next <ArrowRight />
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Submit with {unanswered} unanswered question{unanswered === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>Unanswered questions count as wrong. You need {passPct}% to pass, and you can retake today if you miss it.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="lg" className="h-10" onClick={goToFirstUnanswered}>
              Go to first unanswered
            </Button>
            <Button size="lg" className="h-10" onClick={() => void doSubmit()} loading={submitting}>
              {!submitting && <Send />} Submit anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-2xs text-foreground">{children}</kbd>;
}

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <li className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium", className)}>{children}</li>;
}

function FilterButton({ pressed, onClick, disabled, children }: { pressed: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
        pressed ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ScoreGauge({ pct, passed, passPct }: { pct: number; passed: boolean; passPct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const angle = (2 * Math.PI * passPct) / 100;
  const tick = (d: number) => ({ x: 40 + d * Math.cos(angle), y: 40 + d * Math.sin(angle) });
  const a = tick(r - 7);
  const b = tick(r + 7);
  return (
    <div className="relative size-32 shrink-0" role="img" aria-label={`Score ${pct}%, pass mark ${passPct}%`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90 overflow-visible">
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
          strokeDashoffset={c * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--foreground)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums">{pct}%</span>
        <span className="text-2xs text-muted-foreground">pass {passPct}%</span>
      </span>
    </div>
  );
}
