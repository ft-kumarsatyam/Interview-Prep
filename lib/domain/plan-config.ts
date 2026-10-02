import type { DateStr } from "./dates";

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
  { id: 1, name: "Language & Foundations", fromWeek: 1, toWeek: 7, outcome: "Fluent JS/TS, DBMS & SQL, OOP, 151 core DSA problems" },
  { id: 2, name: "Backend Engineer", fromWeek: 8, toWeek: 12, outcome: "Node internals, transactions, NoSQL, LLD, scaling basics" },
  { id: 3, name: "Distributed Systems & AI", fromWeek: 13, toWeek: 18, outcome: "HLD building blocks, 12+ designs, ML → RAG → agents" },
  { id: 4, name: "Big-Tech Level", fromWeek: 19, toWeek: 20, outcome: "Real architectures, complex designs, behavioral" },
  { id: 5, name: "Interview Mode", fromWeek: 21, toWeek: 24, outcome: "Mocks, revision, live interviews" },
];

export function phaseForWeek(week: number): Phase | null {
  return PHASES.find((p) => week >= p.fromWeek && week <= p.toWeek) ?? null;
}
