export type StudyMode = "normal" | "lighter" | "catch-up";

export interface StudyGuidance {
  mode: StudyMode;
  label: string;
  reason: string;
}

/** Suggests a session shape without changing the frozen plan or streak rules. */
export function studyGuidance(input: { minutesAvailable: number; requiredMinutes: number; backlogMinutes: number; paceRatio: number }): StudyGuidance {
  if (input.minutesAvailable < Math.max(30, input.requiredMinutes * 0.65)) {
    return { mode: "lighter", label: "Lighter session", reason: "Use the time you have for required work; optional items can wait." };
  }
  if (input.backlogMinutes > Math.max(60, input.requiredMinutes * 2) || input.paceRatio < 0.85) {
    return { mode: "catch-up", label: "Catch-up session", reason: "You have open work or are behind pace, so reviews should come before extras." };
  }
  return { mode: "normal", label: "Normal session", reason: "Your available time is enough for today's required work." };
}
