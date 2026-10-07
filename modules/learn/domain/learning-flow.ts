export const LEARNING_STAGES = ["explain", "practice", "recall", "review", "mastery"] as const;
export type LearningStage = (typeof LEARNING_STAGES)[number];
export type LearningStageStatus = "complete" | "current" | "locked";

export interface LearningStageView {
  id: LearningStage;
  title: string;
  description: string;
  status: LearningStageStatus;
}

const STAGE_COPY: Record<LearningStage, { title: string; description: string }> = {
  explain: { title: "Explain", description: "Read the lesson or notes until you can say the idea in your own words." },
  practice: { title: "Practise", description: "Run a short subtopic quiz and fix the first misconception." },
  recall: { title: "Recall", description: "Tick the subtopics you can explain without looking." },
  review: { title: "Review", description: "Return to missed questions and compare the trade-offs." },
  mastery: { title: "Mastery", description: "Pass the topic quiz and keep it fresh with spaced practice." },
};

/**
 * The stable learning lifecycle shown by the UI. Progress remains sourced from
 * existing collections; this function only translates it into guidance.
 */
export function learningPath(input: {
  doneSubtopics: number;
  totalSubtopics: number;
  practiceAttempts: number;
  mastered: boolean;
}): LearningStageView[] {
  const allDone = input.totalSubtopics > 0 && input.doneSubtopics >= input.totalSubtopics;
  const statuses: Record<LearningStage, LearningStageStatus> = {
    explain: input.doneSubtopics > 0 ? "complete" : "current",
    practice: input.practiceAttempts > 0 ? "complete" : input.doneSubtopics > 0 ? "current" : "locked",
    recall: allDone ? "complete" : input.practiceAttempts > 0 ? "current" : "locked",
    review: input.mastered || (allDone && input.practiceAttempts > 0) ? "complete" : allDone ? "current" : "locked",
    mastery: input.mastered ? "complete" : allDone && input.practiceAttempts > 0 ? "current" : "locked",
  };
  return LEARNING_STAGES.map((id) => ({ id, ...STAGE_COPY[id], status: statuses[id] }));
}
