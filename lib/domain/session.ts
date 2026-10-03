/**
 * "Today's session": the ordered loop problems -> theory -> reviews -> quiz, derived from the
 * sidebar's NavToday snapshot. Pure; the quiz stays mandatory and locked until its unlock rule is met.
 */
import type { DayKind } from "./planner";

export interface SessionToday {
  kind: DayKind;
  dsaSolved: number;
  dsaTarget: number;
  theoryDone: number;
  theoryTarget: number;
  quizPassed: boolean;
  quizUnlocked: boolean;
}

export type SessionStepId = "dsa" | "theory" | "review" | "quiz";

export interface SessionStep {
  id: SessionStepId;
  label: string;
  href: string;
  done: boolean;
  /** Not available yet (the quiz before its requirements are met). */
  locked: boolean;
  detail: string;
}

export interface Session {
  steps: SessionStep[];
  /** First step that is not done and not locked; null when everything open is finished. */
  next: SessionStep | null;
  doneCount: number;
}

/** Null on rest days and outside the plan window, where there is no session to run. */
export function buildSession(today: SessionToday | null, dueReviews: number): Session | null {
  if (!today || today.kind === "rest" || today.kind === "outside") return null;
  const steps: SessionStep[] = [];
  if (today.kind === "study" || today.kind === "revision") {
    steps.push({
      id: "dsa",
      label: "Solve",
      href: "/dashboard#problems",
      done: today.dsaSolved >= today.dsaTarget,
      locked: false,
      detail: `${Math.min(today.dsaSolved, today.dsaTarget)}/${today.dsaTarget}`,
    });
    steps.push({
      id: "theory",
      label: "Theory",
      href: "/dashboard#theory",
      done: today.theoryDone >= today.theoryTarget,
      locked: false,
      detail: `${Math.min(today.theoryDone, today.theoryTarget)}/${today.theoryTarget}`,
    });
  }
  if (dueReviews > 0 || today.kind === "sunday") {
    steps.push({ id: "review", label: "Review", href: "/review", done: dueReviews === 0, locked: false, detail: dueReviews === 0 ? "none due" : `${dueReviews} due` });
  }
  steps.push({
    id: "quiz",
    label: today.kind === "sunday" ? "Weekly quiz" : "Quiz",
    href: "/quiz",
    done: today.quizPassed,
    locked: !today.quizPassed && !today.quizUnlocked,
    detail: today.quizPassed ? "passed" : today.quizUnlocked ? "open" : "locked",
  });
  return { steps, next: steps.find((s) => !s.done && !s.locked) ?? null, doneCount: steps.filter((s) => s.done).length };
}
