"use client";

import { useState, useTransition } from "react";
import { ListChecks, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { startQuizAction, submitQuizAction } from "@/app/(app)/quiz/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizSnapshot } from "@/lib/services/quiz";
import { QuizPlayer, type SubmitFn } from "./quiz-player";

export function DailyQuizRunner({ initial, seed, passPct, weekly }: { initial: QuizSnapshot | null; seed: number; passPct: number; weekly: boolean }) {
  const [quiz, setQuiz] = useState<QuizSnapshot | null>(initial);
  const [everPassed, setEverPassed] = useState(initial?.passed ?? false);
  const [bestPct, setBestPct] = useState(initial?.bestPct ?? 0);
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
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ListChecks className="size-6" />
          </div>
          <h2 className="font-medium">{weekly ? "This week's quiz is ready" : "Today's quiz is unlocked"}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {weekly
              ? "Questions from this week's quizzes, weighted toward the ones you missed, plus a few new ones."
              : "10 questions on what you solved and studied today. Generated once and kept for the day."}
          </p>
          <Button onClick={start} disabled={pending}>
            <Sparkles /> {pending ? "Preparing questions…" : "Start quiz"}
          </Button>
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
        <p className="mt-1 text-xs text-muted-foreground">
          Best today: {bestPct}% · {everPassed ? "requirement met ✓" : "pass once to count the day"}
          {current.generatedBy === "bank" ? " · from the offline bank" : ""}
        </p>
      }
    />
  );
}
