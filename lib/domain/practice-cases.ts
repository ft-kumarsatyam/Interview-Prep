import { SECTION_MAX, SECTION_MIN_WORDS, formatClock, rubricScore, type DesignStatus } from "./design";

export { SECTION_MAX, formatClock, rubricScore };

export type PracticeKind = "os" | "dbms";
export const PRACTICE_KINDS: readonly PracticeKind[] = ["os", "dbms"];

/** "Explain it like an interview answer" template: shorter than the 45-minute HLD round. */
export const EXPLAIN_SECTIONS = [
  { id: "definition", label: "Definition", minutes: 3, hint: "State the idea precisely in 2-3 sentences, with the key terms defined." },
  { id: "example", label: "Concrete example", minutes: 5, hint: "A worked example: numbers, a timeline, a small trace or a schema. Show it, don't just say it." },
  { id: "tradeoffs", label: "Trade-offs", minutes: 5, hint: "What does it cost? When is the alternative better? Name at least two options and compare." },
  { id: "realSystems", label: "Real systems", minutes: 4, hint: "Where does this show up: Linux, Postgres, MySQL, Redis, Kafka, the JVM? Say what they actually do." },
  { id: "followups", label: "Follow-ups", minutes: 3, hint: "Answer the next question before they ask it: failure modes, edge cases, how you would test or measure it." },
] as const;

export type ExplainSectionId = (typeof EXPLAIN_SECTIONS)[number]["id"];
export const EXPLAIN_SECTION_IDS = EXPLAIN_SECTIONS.map((s) => s.id) as readonly ExplainSectionId[];
export const EXPLAIN_MINUTES = EXPLAIN_SECTIONS.reduce((n, s) => n + s.minutes, 0);

/** Shared self-review rubric for every OS/DBMS case. */
export const EXPLAIN_RUBRIC = [
  { id: "definition", label: "Gave a precise definition before diving into detail" },
  { id: "example", label: "Walked through a concrete example (numbers, trace or schema)" },
  { id: "tradeoffs", label: "Compared at least two options and said when each wins" },
  { id: "real", label: "Named how a real system (Linux, Postgres, MySQL...) does it" },
  { id: "followup", label: "Anticipated a failure mode or follow-up question" },
] as const;

export type ExplainSections = Partial<Record<string, string>>;

export function explainSectionsAttempted(sections: ExplainSections): number {
  return EXPLAIN_SECTION_IDS.filter((id) => (sections[id] ?? "").trim().split(/\s+/).filter(Boolean).length >= SECTION_MIN_WORDS).length;
}

/** Card state for an OS/DBMS case: mastery from the linked syllabus topic quiz, "practised" needs every section and half the rubric. */
export function practiceStatus(input: {
  topicMastered: boolean;
  subtopicsDone: number;
  sectionsAttempted: number;
  rubricPct: number;
}): DesignStatus {
  if (input.topicMastered) return "mastered";
  if (input.sectionsAttempted === EXPLAIN_SECTION_IDS.length && input.rubricPct >= 50) return "practised";
  if (input.sectionsAttempted > 0 || input.subtopicsDone > 0) return "studying";
  return "new";
}
