import type { DateStr } from "@/core/domain/dates";
import { type DayGap, describeGap, gapIsEmpty } from "@/modules/progress/domain/recap";
import type { PlannerProfile } from "@/modules/planner/domain/planner-profile";

export const PLAN_CHANGE_TYPES = ["goals", "availability", "rest-days", "plan-window", "replan-hours", "carry-over", "intake", "rebalance", "reset", "restore"] as const;
export type PlanChangeType = (typeof PLAN_CHANGE_TYPES)[number];

export interface PlanChangeDraft {
  type: PlanChangeType;
  summary: string;
  before?: unknown;
  after?: unknown;
  dedupeKey?: string;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hoursText = (h: readonly number[]) => h.map((x, i) => `${DOW[i]} ${x}`).join(", ");
const sameList = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface PlannerState {
  profile: PlannerProfile;
  endDate: DateStr;
  startDate: DateStr;
  hoursByDow: readonly number[];
  restDays: readonly DateStr[];
}

/** Every difference between two planner states as a human-readable, reasoned log entry. */
export function diffPlannerChanges(before: PlannerState, after: PlannerState): PlanChangeDraft[] {
  const out: PlanChangeDraft[] = [];
  const parts: string[] = [];
  if (before.profile.targetRole !== after.profile.targetRole) parts.push(`target role "${before.profile.targetRole || "none"}" → "${after.profile.targetRole || "none"}"`);
  if (before.profile.targetCompany !== after.profile.targetCompany) parts.push(`target company "${before.profile.targetCompany || "none"}" → "${after.profile.targetCompany || "none"}"`);
  if (before.profile.preferredLanguage !== after.profile.preferredLanguage) parts.push(`language ${before.profile.preferredLanguage} → ${after.profile.preferredLanguage}`);
  if (!sameList([...before.profile.priorities].sort(), [...after.profile.priorities].sort())) parts.push(`focus ${before.profile.priorities.join(", ") || "none"} → ${after.profile.priorities.join(", ")}`);
  if (parts.length) out.push({ type: "goals", summary: `Goals updated: ${parts.join("; ")}.`, before: before.profile, after: after.profile });

  if (!sameList(before.hoursByDow, after.hoursByDow)) {
    out.push({
      type: "availability",
      summary: `Study hours changed (${hoursText(before.hoursByDow)}) → (${hoursText(after.hoursByDow)}). Future days are re-planned; today's plan stays frozen.`,
      before: before.hoursByDow,
      after: after.hoursByDow,
    });
  }
  if (!sameList(before.restDays, after.restDays)) {
    const added = after.restDays.filter((d) => !before.restDays.includes(d));
    const removed = before.restDays.filter((d) => !after.restDays.includes(d));
    const bits = [added.length ? `added ${added.join(", ")}` : "", removed.length ? `removed ${removed.join(", ")}` : ""].filter(Boolean);
    out.push({ type: "rest-days", summary: `Rest days ${bits.join(" and ")}. Their work is spread over the other days.`, before: before.restDays, after: after.restDays });
  }
  if (before.endDate !== after.endDate || before.startDate !== after.startDate) {
    const bits = [
      before.startDate !== after.startDate ? `start ${before.startDate} → ${after.startDate}` : "",
      before.endDate !== after.endDate ? `interview date ${before.endDate} → ${after.endDate}` : "",
    ].filter(Boolean);
    out.push({ type: "plan-window", summary: `Plan window changed: ${bits.join(", ")}. Daily targets are recalculated for the days left.`, before: { start: before.startDate, end: before.endDate }, after: { start: after.startDate, end: after.endDate } });
  }
  return out;
}

export function replanChange(date: DateStr, hours: number, before: { dsa: number; theory: number }, after: { dsa: number; theory: number }): PlanChangeDraft {
  return {
    type: "replan-hours",
    summary: `Re-planned ${date} for ${hours} h: DSA ${before.dsa} → ${after.dsa}, theory ${before.theory} → ${after.theory}. Work already done stays on the list.`,
    before,
    after,
  };
}

/** The settle step found a past day with unfinished work: record that it rolls forward. */
export function carryOverChange(date: DateStr, gap: DayGap): PlanChangeDraft | null {
  if (gapIsEmpty(gap)) return null;
  const items = describeGap(gap).join(", ");
  const rolled = gap.dsa > 0 || gap.theory > 0 ? "The unfinished problems and subtopics move to the front of the next plan." : "";
  return { type: "carry-over", summary: `${date} closed with ${items} undone. ${rolled}`.trim(), after: gap, dedupeKey: `carry:${date}` };
}
