"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scoreQuiz } from "@/lib/domain/quiz";
import { toPublic, type QuizQuestion } from "@/lib/quiz/question";
import { QuizPlayer, type SubmitFn } from "./quiz-player";

type ReviewQuestion = Pick<QuizQuestion, "id" | "prompt" | "code" | "options" | "answerIndex" | "explanation">;

/** Re-run the questions you missed, graded locally. Doesn't change the stored score. */
export function PracticeWrong({ questions }: { questions: ReviewQuestion[] }) {
  const [open, setOpen] = useState(false);
  const [seed] = useState(() => Date.now() % 100_000);
  if (questions.length === 0) return <p className="text-sm text-success">Nothing missed on the last attempt. 🎉</p>;
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Dumbbell /> Practice {questions.length} wrong answer{questions.length === 1 ? "" : "s"}
      </Button>
    );
  }
  const submit: SubmitFn = async (answers) => {
    const score = scoreQuiz(questions.map((q) => q.answerIndex), answers);
    return {
      ok: true,
      outcome: {
        ...score,
        passed: score.correct === score.total,
        review: questions.map((q) => ({ id: q.id, answerIndex: q.answerIndex, explanation: q.explanation ?? "" })),
      },
    };
  };
  return <QuizPlayer questions={questions.map(toPublic)} seed={seed} passPct={100} submit={submit} />;
}
