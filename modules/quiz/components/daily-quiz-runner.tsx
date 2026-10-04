"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Clock, LayoutDashboard, ListChecks, Loader2, RotateCcw, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { startQuizAction, submitQuizAction } from "@/app/(app)/quiz/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizSnapshot } from "@/modules/quiz/services/quiz";
import { cn } from "@/core/utils";
import { QuizPlayer, type SubmitFn } from "@/modules/quiz/components/quiz-player";

export function DailyQuizRunner({ initial, seed, passPct, weekly }: { initial: QuizSnapshot | null; seed: number; passPct: number; weekly: boolean }) {
  const [quiz, setQuiz] = useState<QuizSnapshot | null>(initial);
  const [everPassed, setEverPassed] = useState(initial?.passed ?? false);
  const [bestPct, setBestPct] = useState(initial?.bestPct ?? 0);
  const [attempts, setAttempts] = useState(initial?.attempts.length ?? 0);
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const res = await startQuizAction();
      if (res.ok) setQuiz(res.quiz);
      else toast.error(res.error);
    });
  }

  if (!quiz) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-5 py-8 text-center sm:py-12">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ListChecks className="size-7" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">{weekly ? "This week's quiz is ready" : "Today's quiz is unlocked"}</h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {weekly
                ? "Questions from this week's quizzes, weighted toward the ones you missed, plus a few new ones."
                : "10 questions on what you solved and studied today. Generated once and kept for the day."}
            </p>
          </div>
          <ul className="grid w-full max-w-md gap-2 text-left text-sm sm:grid-cols-3">
            <Fact icon={Target}>Pass with {passPct}%</Fact>
            <Fact icon={RotateCcw}>Retake any time today</Fact>
            <Fact icon={Clock}>About {weekly ? "10–15" : "5–10"} min</Fact>
          </ul>
          <Button onClick={start} disabled={pending} size="lg" className="h-11 w-full max-w-xs px-6 text-base" aria-busy={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles />}
            {pending ? "Preparing questions…" : "Start quiz"}
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {pending ? "Writing your questions, this can take a few seconds the first time." : "Passing is required to complete the day."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const current = quiz;
  const submit: SubmitFn = async (answers) => {
    const res = await submitQuizAction({ date: current.date, kind: current.kind, answers });
    if (!res.ok) return res;
    const { result } = res;
    setBestPct(result.bestPct);
    setEverPassed(result.everPassed);
    setAttempts((n) => n + 1);
    if (result.justCompleted) void celebrateDayComplete();
    else if (result.outcome.passed) toast.success(weekly ? "Weekly quiz passed" : "Quiz passed: the day's quiz requirement is done");
    return { ok: true, outcome: result.outcome };
  };

  return (
    <QuizPlayer
      key={current.date + current.kind}
      questions={current.questions}
      seed={seed}
      passPct={passPct}
      submit={submit}
      initial={current.last ? { outcome: current.last, answers: current.last.answers } : null}
      resultExtra={
        <div
          className={cn(
            "flex items-start justify-center gap-2 rounded-lg border px-3 py-2 text-left text-xs sm:justify-start",
            everPassed ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning",
          )}
        >
          {everPassed ? <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden /> : <CircleDashed className="mt-px size-4 shrink-0" aria-hidden />}
          <span>
            <span className="font-medium">{everPassed ? "Quiz requirement met for today." : `Pass once (≥ ${passPct}%) to count the day.`}</span>
            <span className="text-muted-foreground">
              {" "}
              Best today {bestPct}%{attempts > 0 ? ` · ${attempts} attempt${attempts === 1 ? "" : "s"}` : ""}
              {current.generatedBy === "bank" ? " · offline question bank" : ""}
            </span>
          </span>
        </div>
      }
      resultActions={
        <Button asChild variant={everPassed ? "default" : "outline"} size="lg" className="h-10 px-4">
          <Link href="/dashboard">
            <LayoutDashboard /> Back to dashboard
          </Link>
        </Button>
      }
    />
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex-col sm:text-center">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      {children}
    </li>
  );
}
