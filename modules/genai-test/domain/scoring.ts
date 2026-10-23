/**
 * Scoring and evaluation of a test: marks, the pass mark that rises through the plan, the verdict that weighs score
 * against how much of the syllabus you have covered, per-level mastery and suggested readiness. Pure.
 */
import { LEVEL_DOMAIN, RUBRIC_MAX } from "@/modules/genai-test/domain/schemas";
import type { PoolQ, WrittenQ } from "@/modules/genai-test/domain/pool";
import type { CoverageStat } from "@/modules/genai-test/domain/coverage";

export const MCQ_WEIGHT = 0.4;
export const WRITTEN_WEIGHT = 0.6;
export const PASS_FIRST_WEEK = 60;
export const PASS_LAST_WEEK = 75;
export const TOTAL_WEEKS = 23;
export const COVERAGE_BEHIND_PCT = 60;
export const LEVEL_COVERAGE_PCT = 80;
export const LEVEL_MASTERY_PCT = 70;
export const MASTERY_NEW_WEIGHT = 0.4;

export interface CriterionScore {
  criterion: string;
  score: number;
  feedback: string;
}

export interface WrittenAnswer {
  text: string;
  scores?: CriterionScore[];
  gradedBy?: "ai" | "self";
  summary?: string;
}

/** The pass mark grows from 60% in week 1 to 75% in week 23, because more is expected as more is covered. */
export function passMark(weekIdx: number): number {
  const w = Math.min(TOTAL_WEEKS, Math.max(1, weekIdx));
  return Math.round(PASS_FIRST_WEEK + ((PASS_LAST_WEEK - PASS_FIRST_WEEK) * (w - 1)) / (TOTAL_WEEKS - 1));
}

export const isBlankAnswer = (a: WrittenAnswer | undefined): boolean => !a?.text.trim();

/** Percent for one written answer, or null while it waits for a grade. A blank answer scores 0. */
export function writtenPct(a: WrittenAnswer | undefined, criteria: number): number | null {
  if (isBlankAnswer(a)) return 0;
  if (!a?.scores || a.scores.length < criteria) return null;
  return Math.round((100 * a.scores.reduce((s, x) => s + x.score, 0)) / (RUBRIC_MAX * a.scores.length));
}

export interface ItemResult {
  q: PoolQ;
  /** 0-100, or null while a written answer is ungraded. */
  pct: number | null;
}

export function itemResult(q: PoolQ, answer: number | WrittenAnswer | null | undefined, criteria: number): ItemResult {
  if (q.kind === "mcq") return { q, pct: typeof answer === "number" && answer === q.answer ? 100 : 0 };
  return { q, pct: writtenPct(typeof answer === "object" && answer ? answer : undefined, criteria) };
}

export interface TestScore {
  mcqCorrect: number;
  mcqTotal: number;
  mcqPct: number | null;
  writtenPct: number | null;
  pendingWritten: number;
  /** null while any written answer is ungraded. */
  pct: number | null;
}

export function scoreTest(results: readonly ItemResult[]): TestScore {
  const mcq = results.filter((r) => r.q.kind === "mcq");
  const written = results.filter((r) => r.q.kind === "written");
  const mcqCorrect = mcq.filter((r) => r.pct === 100).length;
  const mcqPct = mcq.length ? Math.round((100 * mcqCorrect) / mcq.length) : null;
  const pending = written.filter((r) => r.pct === null).length;
  const wp = written.length && !pending ? Math.round(written.reduce((s, r) => s + (r.pct ?? 0), 0) / written.length) : null;
  const pct = pending ? null : mcqPct !== null && wp !== null ? Math.round(MCQ_WEIGHT * mcqPct + WRITTEN_WEIGHT * wp) : mcqPct ?? wp;
  return { mcqCorrect, mcqTotal: mcq.length, mcqPct, writtenPct: wp, pendingWritten: pending, pct };
}

export type Verdict = "strong" | "on-track" | "revise" | "behind";
export const VERDICT_LABEL: Record<Verdict, string> = { strong: "Strong", "on-track": "On track", revise: "Needs revision", behind: "Behind on the syllabus" };

/** Weighs the score against coverage: a good score on a thin syllabus is still "behind". */
export function verdict(pct: number, mark: number, coverage: CoverageStat): Verdict {
  if (coverage.expected > 0 && coverage.pct < COVERAGE_BEHIND_PCT) return "behind";
  if (pct >= mark + 15) return "strong";
  return pct >= mark ? "on-track" : "revise";
}

export const passed = (pct: number | null, mark: number): boolean => pct !== null && pct >= mark;

/** Earned and possible percent points per roadmap level from a test's graded items. */
export function levelResults(results: readonly ItemResult[]): Map<number, { earned: number; max: number }> {
  const out = new Map<number, { earned: number; max: number }>();
  for (const r of results) {
    if (r.pct === null) continue;
    const cur = out.get(r.q.level) ?? { earned: 0, max: 0 };
    cur.earned += r.pct;
    cur.max += 100;
    out.set(r.q.level, cur);
  }
  return out;
}

/** Per-level mastery over time: an exponential average of the level's percent in each test, oldest first. */
export function levelMastery(perTest: readonly Map<number, { earned: number; max: number }>[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const t of perTest)
    for (const [level, { earned, max }] of t) {
      if (!max) continue;
      const pct = (100 * earned) / max;
      const prev = out.get(level);
      out.set(level, Math.round(prev === undefined ? pct : MASTERY_NEW_WEIGHT * pct + (1 - MASTERY_NEW_WEIGHT) * prev));
    }
  return out;
}

/** Highest level n such that every level up to n that has topics is covered 80% and mastered 70%; -1 when level 0 is not. */
export function levelReached(levels: readonly number[], coverage: ReadonlyMap<number, CoverageStat>, mastery: ReadonlyMap<number, number>): number {
  let reached = -1;
  for (const l of [...levels].sort((a, b) => a - b)) {
    const c = coverage.get(l);
    if (!c || c.expected === 0) continue;
    if (c.pct >= LEVEL_COVERAGE_PCT && (mastery.get(l) ?? 0) >= LEVEL_MASTERY_PCT) reached = l;
    else break;
  }
  return reached;
}

/** Map a percent to the playbook's 0-5 readiness scale: 0 no data, then 1-5. */
export function readinessFromPct(pct: number | undefined): number {
  if (pct === undefined) return 0;
  return pct < 40 ? 1 : pct < 55 ? 2 : pct < 70 ? 3 : pct < 85 ? 4 : 5;
}

/** Suggested readiness per playbook domain from level percentages (shown, never saved for you). */
export function suggestedReadiness(mastery: ReadonlyMap<number, number>): Record<string, number> {
  const by = new Map<string, number[]>();
  for (const [level, pct] of mastery) {
    const d = LEVEL_DOMAIN[level];
    if (d) by.set(d, [...(by.get(d) ?? []), pct]);
  }
  const out: Record<string, number> = {};
  for (const [d, v] of by) out[d] = readinessFromPct(v.reduce((a, b) => a + b, 0) / v.length);
  return out;
}

export const isGradable = (q: PoolQ): q is WrittenQ => q.kind === "written";
