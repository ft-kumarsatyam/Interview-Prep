import { weekNumber, type DateStr } from "./dates";

export interface PlanSettings {
  startDate: DateStr;
  endDate: DateStr;
  timezone: string;
  quizPassPct: number;
  /** Adaptive DSA clamp for a normal weekday. */
  minDailyDsa: number;
  maxDailyDsa: number;
  /** Saturday is a double day, capped here. */
  maxSaturdayDsa: number;
  maxDailyTheory: number;
  /** Final weeks reserved for revision: no new-problem pressure. */
  revisionWeeks: number;
  /** Planned days off (count as complete, carry no targets). */
  restDays: DateStr[];
  /**
   * Study hours per day of week, Sunday first. When set, each day's counts are scaled
   * to the hours (see lib/domain/time-budget.ts); when absent the plan is count-based.
   */
  hoursByDow?: readonly number[];
}

export const DEFAULT_SETTINGS: PlanSettings = {
  startDate: "2026-10-05",
  endDate: "2027-03-21",
  timezone: "Asia/Kolkata",
  quizPassPct: 60,
  minDailyDsa: 3,
  maxDailyDsa: 6,
  maxSaturdayDsa: 10,
  maxDailyTheory: 5,
  revisionWeeks: 3,
  restDays: [],
};

/** Fixed DSA targets while learning JavaScript, before the adaptive target kicks in. */
export const DSA_RAMP: ReadonlyArray<{ untilWeek: number; perDay: number }> = [
  { untilWeek: 2, perDay: 2 },
  { untilWeek: 4, perDay: 3 },
];

export const SQL_TRACK_START_WEEK = 4;
export const REVIEWS_PER_DAY = 2;
export const REVIEWS_ON_SUNDAY = 4;
export const REVISION_DSA_PER_DAY = 2;
export const MAX_FREEZE_TOKENS = 2;
export const FREEZE_EARNED_EVERY = 7;
/** Soft daily reading goal shown on the dashboard (not part of completion). */
export const READINGS_PER_DAY = 2;

export interface Phase {
  id: number;
  name: string;
  fromWeek: number;
  toWeek: number;
  outcome: string;
}

export const PHASES: Phase[] = [
  { id: 1, name: "Language & Foundations", fromWeek: 1, toWeek: 7, outcome: "Fluent JS/TS, DBMS & SQL, OOP, 153 core DSA problems" },
  { id: 2, name: "Backend Engineer", fromWeek: 8, toWeek: 12, outcome: "Node internals, transactions, NoSQL, LLD, scaling basics" },
  { id: 3, name: "Distributed Systems & AI", fromWeek: 13, toWeek: 18, outcome: "HLD building blocks, 12+ designs, ML → RAG → agents" },
  { id: 4, name: "Big-Tech Level", fromWeek: 19, toWeek: 20, outcome: "Real architectures, complex designs, behavioral" },
  { id: 5, name: "Interview Mode", fromWeek: 21, toWeek: 24, outcome: "Mocks, revision, live interviews" },
];

/** The syllabus and the phases above are written for this many weeks. */
export const BASE_WEEKS = 24;

/** Total weeks in the plan window. */
export const totalWeeks = (s: Pick<PlanSettings, "startDate" | "endDate">): number => Math.max(1, weekNumber(s.endDate, s.startDate));

/**
 * Where a base-plan week (1-24) lands in this window. A window shorter than 24 weeks compresses the syllabus
 * proportionally so every topic still comes due before the interview; a longer one keeps the base pace and leaves slack.
 */
export function scaledWeek(baseWeek: number, s: Pick<PlanSettings, "startDate" | "endDate">): number {
  const total = totalWeeks(s);
  if (total >= BASE_WEEKS) return baseWeek;
  return Math.max(1, Math.ceil((baseWeek * total) / BASE_WEEKS));
}

/** The phases fitted to a window of `total` weeks. With 24 weeks or more they are unchanged. */
export function phasesFor(total: number): Phase[] {
  if (total >= BASE_WEEKS) return PHASES;
  const scale = (w: number) => Math.max(1, Math.ceil((w * total) / BASE_WEEKS));
  const out: Phase[] = [];
  for (const p of PHASES) {
    const fromWeek = scale(p.fromWeek);
    const toWeek = scale(p.toWeek);
    const prev = out[out.length - 1];
    // Phases that squeeze into the same week as the previous one are dropped.
    if (prev && toWeek <= prev.toWeek) continue;
    out.push({ ...p, fromWeek: prev ? prev.toWeek + 1 : fromWeek, toWeek });
  }
  if (out.length) out[out.length - 1] = { ...out[out.length - 1]!, toWeek: Math.max(total, out[out.length - 1]!.toWeek) };
  return out;
}

export function phaseForWeek(week: number, total: number = BASE_WEEKS): Phase | null {
  return phasesFor(total).find((p) => week >= p.fromWeek && week <= p.toWeek) ?? null;
}
