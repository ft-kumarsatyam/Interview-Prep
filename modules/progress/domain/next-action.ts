import type { DayKind } from "@/modules/progress/domain/dashboard-view";

export type StudyActionKind = "dsa" | "theory" | "review" | "quiz" | "backlog" | "mock" | "career";

export interface StudyActionCandidate {
  kind: StudyActionKind;
  title: string;
  href: string;
  reason: string;
  minutes?: number;
  required: boolean;
  done?: boolean;
  locked?: boolean;
  rank: number;
}

export interface StudyNextAction extends StudyActionCandidate {
  label: string;
}

export interface NextActionInput {
  kind: DayKind;
  candidates: readonly StudyActionCandidate[];
}

/** Selects the one action that should be shown consistently across the app. */
export function selectNextAction(input: NextActionInput): StudyNextAction | null {
  if (input.kind === "rest" || input.kind === "outside") return null;

  const candidate = input.candidates
    .filter((item) => !item.done && !item.locked)
    .toSorted((a, b) => (a.rank - b.rank) || Number(b.required) - Number(a.required));
  const next = candidate[0];
  if (!next) return null;

  const label =
    next.kind === "dsa" ? "Solve next problem" :
    next.kind === "theory" ? "Study today's theory" :
    next.kind === "review" ? "Review due problem" :
    next.kind === "quiz" ? "Take the daily quiz" :
    next.kind === "mock" ? "Start mock interview" :
    next.kind === "career" ? "Continue career task" :
    "Work on backlog";

  return { ...next, label };
}
