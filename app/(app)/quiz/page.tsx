import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarOff, CheckCircle2, Circle, Code2, History, ListChecks, Lock, RotateCcw } from "lucide-react";
import { DailyQuizRunner } from "@/components/quiz/daily-quiz-runner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seedFrom } from "@/lib/domain/sampling";
import { getQuizPage } from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage() {
  const state = await getQuizPage();
  const weekly = state.kind === "weekly";
  const passedToday = !!state.quiz?.passed;

  return (
    <>
      <PageHeader
        title={weekly ? "Weekly quiz" : "Daily quiz"}
        icon={ListChecks}
        description={
          weekly
            ? `Sunday review: pass with ${state.passPct}% or more to complete the day.`
            : `10 questions from what you studied today. Pass with ${state.passPct}% or more to complete the day.`
        }
      >
        {state.kind && (
          <Badge variant="outline" className={cn("h-7 px-2.5", passedToday ? "border-success/30 bg-success/10 text-success" : "text-muted-foreground")}>
            {passedToday ? <CheckCircle2 aria-hidden /> : <Circle aria-hidden />}
            {passedToday ? "Passed today" : "Not passed yet"}
          </Badge>
        )}
        <Button asChild variant="outline" size="lg" className="h-9">
          <Link href="/quiz/mistakes">
            <RotateCcw /> Mistakes
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-9">
          <Link href="/quiz/history">
            <History /> History
          </Link>
        </Button>
      </PageHeader>
      {!state.kind ? (
        <EmptyState
          icon={CalendarOff}
          title="No quiz today"
          action={
            <Button asChild size="lg" className="h-10 px-4">
              <Link href="/learn">
                <BookOpen /> Practice in Learn
              </Link>
            </Button>
          }
        >
          It&apos;s a rest day or outside the plan. Practice quizzes in Learn are always open, and your past quizzes are in{" "}
          <Link href="/quiz/history" className="text-primary hover:underline">
            History
          </Link>
          .
        </EmptyState>
      ) : !state.day.quizUnlocked && !state.quiz ? (
        <LockedQuiz day={state.day} />
      ) : (
        <DailyQuizRunner initial={state.quiz} seed={seedFrom(state.today)} passPct={state.passPct} weekly={weekly} />
      )}
    </>
  );
}

function LockedQuiz({ day }: { day: { dsaSolved: number; dsaTarget: number; theoryDone: number; theoryTarget: number } }) {
  const dsaNeed = Math.min(1, day.dsaTarget);
  const theoryNeed = Math.min(1, day.theoryTarget);
  const steps = [
    { key: "dsa", label: "Solve a problem", need: dsaNeed, have: day.dsaSolved, target: day.dsaTarget, unit: "solved", href: "/dashboard", cta: "Today's problems", icon: Code2 },
    { key: "theory", label: "Check off a subtopic", need: theoryNeed, have: day.theoryDone, target: day.theoryTarget, unit: "checked", href: "/learn", cta: "Open theory", icon: BookOpen },
  ];
  const done = steps.filter((s) => s.have >= s.need).length;

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-5 py-4 sm:py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="size-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Quiz locked</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish these to unlock today&apos;s quiz · <span className="font-mono tabular-nums">{done}/{steps.length}</span> done
            </p>
          </div>
        </div>
        <ol className="space-y-2.5">
          {steps.map((s) => {
            const met = s.have >= s.need;
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                className={cn("flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center", met ? "border-success/30 bg-success/5" : "bg-muted/20")}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {met ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", met && "text-muted-foreground line-through decoration-success/60")}>
                      {s.label}
                      <span className="sr-only">{met ? ", done" : ", not done"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.need === 0 ? "Not needed today" : `${s.have} ${s.unit} today${s.target > 0 ? ` · target ${s.target}` : ""}`}
                    </p>
                  </div>
                </div>
                {!met && (
                  <Button asChild size="lg" className="h-10 px-4">
                    <Link href={s.href}>
                      <Icon /> {s.cta} <ArrowRight />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-center text-xs text-muted-foreground">Passing the quiz is required to complete the day and keep your streak.</p>
      </CardContent>
    </Card>
  );
}
