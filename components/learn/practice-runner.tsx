"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Award, Play } from "lucide-react";
import { toast } from "sonner";
import { startPracticeAction, submitPracticeAction } from "@/app/(app)/learn/practice/actions";
import { QuizPlayer, type SubmitFn } from "@/components/quiz/quiz-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PracticeResult, PracticeStart } from "@/lib/services/practice";

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
}: {
  target: string;
  scope: "subtopic" | "topic";
  passPct: number;
  size: number;
}) {
  const [run, setRun] = useState<PracticeStart | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const res = await startPracticeAction(practiceRef);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(null);
      setRun(res.run);
    });
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            {scope === "topic"
              ? `${size} questions across the topic, weighted toward your weakest subtopics. Score ≥ ${passPct}% to earn Mastered.`
              : `${size} quick questions. Practice is ungated and doesn't affect your streak; each run updates your mastery score.`}
          </p>
          <Button onClick={start} disabled={pending}>
            <Play /> {pending ? "Preparing…" : scope === "topic" ? "Start topic quiz" : "Start practice"}
          </Button>
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
    <QuizPlayer
      key={current.attemptId}
      questions={current.questions}
      seed={parseInt(current.attemptId.slice(-6), 16)}
      passPct={passPct}
      submit={submit}
      onRetake={start}
      retakeLabel={pending ? "Preparing…" : "New run"}
      resultExtra={
        result && (
          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
            <p>
              Mastery {result.mastery.score}% · best {result.mastery.bestPct}% · {result.mastery.attempts} run{result.mastery.attempts === 1 ? "" : "s"}
            </p>
            {result.target.scope === "topic" &&
              (result.mastery.masteredOn ? (
                <p className="inline-flex items-center gap-1 text-success">
                  <Award className="size-3.5" /> Mastered on {result.mastery.masteredOn}
                </p>
              ) : (
                <p>Score ≥ {result.thresholdPct}% on a topic quiz to earn Mastered.</p>
              ))}
            <p>
              <Link href={`/learn?track=${result.target.track}`} className="text-primary hover:underline">
                Back to {result.target.topicTitle}
              </Link>
            </p>
          </div>
        )
      }
    />
  );
}
