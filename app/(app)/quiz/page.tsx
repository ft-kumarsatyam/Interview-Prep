import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, History, Lock } from "lucide-react";
import { DailyQuizRunner } from "@/components/quiz/daily-quiz-runner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { seedFrom } from "@/lib/domain/sampling";
import { getQuizPage } from "@/lib/services/quiz";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage() {
  const state = await getQuizPage();
  const weekly = state.kind === "weekly";
  const history = (
    <Button asChild variant="outline" size="sm">
      <Link href="/quiz/history">
        <History /> History
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title={weekly ? "Weekly quiz" : "Daily quiz"}
        description={
          weekly
            ? `Sunday review: pass ≥ ${state.passPct}% to complete the day.`
            : `10 questions from what you studied today. Pass ≥ ${state.passPct}% to complete the day.`
        }
      >
        {history}
      </PageHeader>
      {!state.kind ? (
        <EmptyState icon={CalendarOff} title="No quiz today">
          It&apos;s a rest day or outside the plan. Practice quizzes in <Link href="/learn" className="text-primary hover:underline">Learn</Link> are always open.
        </EmptyState>
      ) : !state.day.quizUnlocked && !state.quiz ? (
        <EmptyState icon={Lock} title="Quiz locked">
          <p>Solve at least 1 problem and check 1 subtopic to unlock today&apos;s quiz.</p>
          <p className="mt-3 flex justify-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard">Today&apos;s problems</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/learn">Theory</Link>
            </Button>
          </p>
        </EmptyState>
      ) : (
        <DailyQuizRunner initial={state.quiz} seed={seedFrom(state.today)} passPct={state.passPct} weekly={weekly} />
      )}
    </>
  );
}
