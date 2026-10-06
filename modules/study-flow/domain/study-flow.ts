/**
 * The single ordering rule for a study session.
 *
 * The daily planner remains responsible for the streak contract. This module
 * only turns that plan and the independent Learn/Practice sources into one
 * actionable queue.
 */

export const STUDY_FLOW_KINDS = ["dsa", "theory", "review", "quiz", "course", "roadmap", "practice"] as const;
export type StudyFlowKind = (typeof STUDY_FLOW_KINDS)[number];
export type StudyFlowBucket = "required" | "recommended" | "optional";

export interface StudyFlowItem {
  id: string;
  kind: StudyFlowKind;
  title: string;
  href: string;
  minutes: number;
  bucket: StudyFlowBucket;
  done: boolean;
  locked?: boolean;
  reason: string;
  source?: string;
  priority?: "must" | "can" | "skip";
}

export interface StudyFlowInput {
  dayKind: "study" | "sunday" | "rest" | "revision" | "outside";
  minutesAvailable: number;
  required: readonly StudyFlowItem[];
  reviews?: readonly StudyFlowItem[];
  roadmap?: readonly StudyFlowItem[];
  courses?: readonly StudyFlowItem[];
  practice?: readonly StudyFlowItem[];
}

const kindOrder: Record<StudyFlowKind, number> = {
  review: 0,
  dsa: 1,
  theory: 2,
  course: 3,
  roadmap: 4,
  practice: 5,
  quiz: 6,
};

/**
 * Required work is never displaced. Optional capacity is filled in a stable
 * order: due reviews, must-do roadmap nodes, the next course lesson, then
 * weak/unmastered practice.
 */
export function buildStudyQueue(input: StudyFlowInput): StudyFlowItem[] {
  const required = input.required.map((item) => ({ ...item, bucket: "required" as const }));
  if (input.dayKind === "rest" || input.dayKind === "outside") return required;

  const candidates = [
    ...(input.reviews ?? []).map((item) => ({ ...item, bucket: "recommended" as const })),
    ...(input.roadmap ?? [])
      .filter((item) => item.priority !== "skip")
      .map((item) => ({ ...item, bucket: item.priority === "must" ? "recommended" as const : "optional" as const })),
    ...(input.courses ?? []).map((item) => ({ ...item, bucket: "recommended" as const })),
    ...(input.practice ?? []).map((item) => ({ ...item, bucket: "optional" as const })),
  ];

  const seen = new Set(required.map((item) => item.id));
  let usedMinutes = required.reduce((sum, item) => sum + item.minutes, 0);
  const optional = candidates
    .filter((item) => !seen.has(item.id))
    .sort((a, b) => {
      const bucketRank = (x: StudyFlowItem) => x.bucket === "recommended" ? 0 : 1;
      const rank = (x: StudyFlowItem) => x.kind === "review" ? 0 : x.kind === "roadmap" && x.priority === "must" ? 1 : x.kind === "course" ? 2 : x.kind === "roadmap" ? 3 : kindOrder[x.kind] + 3;
      return bucketRank(a) - bucketRank(b) || rank(a) - rank(b) || a.title.localeCompare(b.title);
    })
    .filter((item) => {
      if (item.done || item.locked) return true;
      if (usedMinutes + item.minutes > Math.max(input.minutesAvailable, usedMinutes)) return false;
      usedMinutes += item.minutes;
      return true;
    });

  return [...required, ...optional];
}

export function nextStudyItem(items: readonly StudyFlowItem[]): StudyFlowItem | null {
  return items.find((item) => !item.done && !item.locked) ?? null;
}
