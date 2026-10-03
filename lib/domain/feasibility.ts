import { addDays, dayOfWeek, eachDay, type DateStr } from "./dates";
import { dayKind, revisionStart } from "./planner";
import type { PlanSettings } from "./plan-config";
import { baselineMinutes, hoursOn, type Costs, type Difficulty, type HoursOverride } from "./time-budget";
import type { Tier } from "./planner-intake";

/** Spaced reviews and slips take this share of the available time. */
const OVERHEAD = 0.1;
const TIGHT_FROM = 0.85;
const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 1.5;

export interface FeasibilityTopic {
  id: string;
  topicId: string;
  done: boolean;
  /** 0 = skipped. 1 when the topic isn't rated. */
  weight: number;
  tier: Tier;
}

export interface FeasibilityInput {
  /** First day that still counts (usually today). */
  from: DateStr;
  settings: PlanSettings;
  overrides?: readonly HoursOverride[];
  costs: Costs;
  /** Difficulty of every unsolved main-track problem. */
  dsaPool: readonly Difficulty[];
  jsLeft: number;
  sqlLeft: number;
  subtopics: readonly FeasibilityTopic[];
}

export type FeasibilityStatus = "on-track" | "tight" | "at-risk";

export type Remedy =
  | { kind: "drop-nice"; minutes: number; subtopics: number; resolves: boolean }
  | { kind: "add-hours"; hoursPerWeek: number }
  | { kind: "extend-date"; weeks: number };

export interface Feasibility {
  requiredMin: number;
  availableMin: number;
  /** Share of the required work the time covers, 0-1. */
  coverage: number;
  /** Same, counting only must-have topics. */
  mustCoverage: number;
  gapMin: number;
  status: FeasibilityStatus;
  studyDays: number;
  remedies: Remedy[];
}

export const theoryCost = (weight: number, costs: Costs) => costs.theory * Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));

/** Minutes of new work each day can hold: its hours less the fixed blocks (quiz, news, Saturday write-up). Sundays and rest days hold none. */
export function availableMinutes(from: DateStr, s: PlanSettings, costs: Costs, overrides: readonly HoursOverride[] = []): { minutes: number; studyDays: number } {
  const last = addDays(revisionStart(s), -1);
  const start = from > s.startDate ? from : s.startDate;
  if (start > last) return { minutes: 0, studyDays: 0 };
  let minutes = 0;
  let studyDays = 0;
  for (const date of eachDay(start, last)) {
    if (dayKind(date, s) !== "study") continue;
    const hours = hoursOn(date, s, overrides);
    const budget = hours === undefined ? baselineMinutes(date) : hours * 60;
    const fixed = costs.dailyQuiz + costs.news + (dayOfWeek(date) === 6 ? costs.writeUp : 0);
    minutes += Math.max(0, budget - fixed);
    studyDays++;
  }
  return { minutes, studyDays };
}

/** Whether the remaining work fits the time before revision starts, and what would fix it if not. Pure: no I/O. */
export function assessFeasibility(input: FeasibilityInput): Feasibility {
  const { costs } = input;
  const open = input.subtopics.filter((t) => !t.done && t.weight > 0);
  const niceTheory = open.filter((t) => t.tier === "nice");
  const sum = (ts: readonly FeasibilityTopic[]) => ts.reduce((n, t) => n + theoryCost(t.weight, costs), 0);
  const fixedWork = input.dsaPool.reduce((n, d) => n + costs.dsa[d], 0) + input.jsLeft * costs.js + input.sqlLeft * costs.sql;
  const requiredMin = Math.round(fixedWork + sum(open));
  const mustMin = Math.round(fixedWork + sum(open.filter((t) => t.tier !== "nice")));

  const { minutes: rawAvailable, studyDays } = availableMinutes(input.from, input.settings, costs, input.overrides);
  const availableMin = Math.round(rawAvailable * (1 - OVERHEAD));
  const ratio = (need: number) => (need <= 0 ? 1 : availableMin / need);
  const coverage = Math.min(1, ratio(requiredMin));
  const gapMin = Math.max(0, requiredMin - availableMin);
  const status: FeasibilityStatus = ratio(requiredMin) >= 1 ? "on-track" : ratio(requiredMin) >= TIGHT_FROM ? "tight" : "at-risk";

  const remedies: Remedy[] = [];
  if (gapMin > 0) {
    const niceMin = Math.round(sum(niceTheory));
    if (niceMin > 0) remedies.push({ kind: "drop-nice", minutes: niceMin, subtopics: niceTheory.length, resolves: niceMin >= gapMin });
    const weeksLeft = Math.max(1, studyDays / 6);
    remedies.push({ kind: "add-hours", hoursPerWeek: Math.ceil((gapMin / 60 / weeksLeft) * 2) / 2 });
    if (studyDays > 0 && rawAvailable > 0) {
      const perDay = availableMin / studyDays;
      remedies.push({ kind: "extend-date", weeks: Math.max(1, Math.ceil(Math.ceil(gapMin / perDay) / (studyDays / weeksLeft))) });
    }
  }
  return { requiredMin, availableMin, coverage, mustCoverage: Math.min(1, ratio(mustMin)), gapMin, status, studyDays, remedies };
}
