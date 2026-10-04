"use client";

import { useState } from "react";
import { Dumbbell, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { correctAnswerKey, scoreQuiz } from "@/modules/quiz/domain/quiz";
import { toPublic, toReview, type QuizQuestion } from "@/modules/quiz/lib/question";
import { QuizPlayer, type SubmitFn } from "@/modules/quiz/components/quiz-player";

type ReviewQuestion = Pick<QuizQuestion, "id" | "prompt" | "code" | "options" | "answerIndex" | "explanation"> & Partial<Pick<QuizQuestion, "type" | "answerIndices">> & { subject?: string };

/** Re-run the questions you missed, graded locally. Doesn't change the stored score. */
export function PracticeWrong({ questions }: { questions: ReviewQuestion[] }) {
  const [open, setOpen] = useState(false);
  const [seed] = useState(() => Date.now() % 100_000);
  const n = questions.length;

  if (n === 0) {
    return (
      <Card className="bg-success/5 ring-success/30">
        <CardContent className="flex items-center gap-3 text-sm">
          <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
          <p>
            <span className="font-medium text-success">Nothing missed on the last attempt.</span> <span className="text-muted-foreground">No wrong answers to practise.</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="bg-primary/5 ring-primary/25">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary sm:grid">
            <Dumbbell className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {n} question{n === 1 ? "" : "s"} to practise
            </p>
            <p className="text-sm text-muted-foreground">Re-run what you missed in a fresh order. Practice doesn&apos;t change the stored score.</p>
          </div>
          <Button size="lg" className="h-10 px-4" onClick={() => setOpen(true)}>
            <Dumbbell /> Practice {n} wrong answer{n === 1 ? "" : "s"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const submit: SubmitFn = async (answers) => {
    const score = scoreQuiz(questions.map(correctAnswerKey), answers);
    return {
      ok: true,
      outcome: {
        ...score,
        passed: score.correct === score.total,
        review: questions.map(toReview),
      },
    };
  };
  return (
    <section aria-label="Practice wrong answers" className="space-y-3 rounded-xl border border-primary/25 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Dumbbell className="size-4 text-primary" aria-hidden /> Practice mode · get all {n} right
        </p>
        <Button variant="ghost" size="sm" className="h-9" onClick={() => setOpen(false)}>
          <X /> Exit
        </Button>
      </div>
      <QuizPlayer questions={questions.map(toPublic)} seed={seed} passPct={100} submit={submit} />
    </section>
  );
}
