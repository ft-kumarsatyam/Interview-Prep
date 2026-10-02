"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Award, Keyboard, ListChecks, Loader2, Play, RotateCcw, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { startPracticeAction, submitPracticeAction } from "@/app/(app)/learn/practice/actions";
import { QuizPlayer, type SubmitFn } from "@/components/quiz/quiz-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PracticeResult, PracticeStart } from "@/lib/services/practice";

export interface NextStep {
  href: string;
  label: string;
}

async function celebrateMastered(title: string) {
  toast.success(`Mastered: ${title} 🏅`);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
}

export function PracticeRunner({
  target: practiceRef,
  scope,
  passPct,
  size,
  bestPct,
  back,
  next,
}: {
  target: string;
  scope: "subtopic" | "topic" | "case";
  passPct: number;
  size: number;
  bestPct: number | null;
  back: NextStep;
  next: NextStep | null;
}) {
  const [run, setRun] = useState<PracticeStart | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await startPracticeAction(practiceRef);
      if (!res.ok) {
        setError(res.error);
        toast.error(`${res.error}. Try starting again.`);
        return;
      }
      setResult(null);
      setRun(res.run);
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  }

  if (pending) return <PreparingSkeleton size={size} />;

  if (!run) {
    const startLabel = scope === "topic" ? "Start topic quiz" : scope === "case" ? "Start case quiz" : "Start practice";
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-5">
          <p className="text-sm text-pretty text-muted-foreground">
            {scope === "topic"
              ? "Questions span the whole topic, weighted toward your weakest subtopics."
              : scope === "case"
                ? "Trade-offs, numbers and the usual follow-ups. Each answer links back to the part of the case that explains it."
                : "Quick check on this subtopic. Practice is ungated and doesn't affect your streak; each run updates your mastery score."}
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            <Fact icon={ListChecks} label="Questions" value={String(size)} />
            <Fact icon={Target} label={scope === "topic" ? "To master" : "To pass"} value={`${passPct}%`} />
            <Fact icon={Trophy} label="Your best" value={bestPct === null ? "–" : `${bestPct}%`} />
          </ul>
          <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Keyboard className="size-4" aria-hidden /> Answer with keys 1–4, Enter or → for next, ← to go back.
          </p>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Couldn&apos;t prepare questions: {error}. Try again in a moment.</span>
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" asChild>
              <Link href={back.href}>
                <ArrowLeft /> Back
              </Link>
            </Button>
            <Button size="lg" onClick={start} disabled={pending} className="w-full sm:w-auto">
              {error ? <RotateCcw /> : <Play />} {error ? "Try again" : startLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = run;
  const submit: SubmitFn = async (answers) => {
    const res = await submitPracticeAction({ attemptId: current.attemptId, answers });
    if (!res.ok) return res;
    setResult(res.result);
    if (res.result.newlyMastered) void celebrateMastered(current.target.title);
    return { ok: true, outcome: res.result.outcome };
  };

  return (
    <div className="mx-auto max-w-2xl">
      <QuizPlayer
        key={current.attemptId}
        questions={current.questions}
        seed={parseInt(current.attemptId.slice(-6), 16)}
        passPct={passPct}
        submit={submit}
        onRetake={start}
        retakeLabel="New run"
        resultExtra={
          result && (
            <div className="mt-1 space-y-3">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Mastery {result.mastery.score}% · best {result.mastery.bestPct}% · {result.mastery.attempts} run{result.mastery.attempts === 1 ? "" : "s"}
                </p>
                {result.target.scope === "topic" &&
                  (result.mastery.masteredOn ? (
                    <p className="inline-flex items-center gap-1 text-success">
                      <Award className="size-3.5" aria-hidden /> Mastered on {result.mastery.masteredOn}
                    </p>
                  ) : (
                    <p>Score ≥ {result.thresholdPct}% on a topic quiz to earn Mastered.</p>
                  ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {next && (
                  <Button size="sm" asChild className="h-9 max-w-full">
                    <Link href={next.href}>
                      <span className="truncate">{next.label}</span> <ArrowRight />
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild className="h-9 max-w-full">
                  <Link href={back.href}>
                    <ArrowLeft /> <span className="truncate">Back to {back.label}</span>
                  </Link>
                </Button>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="tabular font-mono font-medium">{value}</span>
    </li>
  );
}

function PreparingSkeleton({ size }: { size: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden /> Preparing {size} questions… this can take a few seconds.
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: size }, (_, i) => (
          <Skeleton key={i} className="size-2.5 rounded-full" />
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <div className="grid gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
