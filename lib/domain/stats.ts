import { addDays, eachDay, weekNumber, type DateStr } from "./dates";

export interface SolveRow {
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  main: boolean;
  /** Every local date the problem was solved on (first solve plus re-solves). */
  solveDates: readonly DateStr[];
}

/** Solves logged per day over the last `days` days, re-solves included. */
export function solvesPerDay(rows: readonly SolveRow[], today: DateStr, days = 30): Array<{ date: DateStr; count: number }> {
  const from = addDays(today, -(days - 1));
  const counts = new Map<DateStr, number>();
  for (const r of rows) for (const d of r.solveDates) if (d >= from && d <= today) counts.set(d, (counts.get(d) ?? 0) + 1);
  return eachDay(from, today).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/**
 * Distinct main-track problems solved by each day against the ideal curve,
 * from plan start to today (or the plan end, whichever is first).
 */
export function cumulativeVsIdeal(
  rows: readonly SolveRow[],
  startDate: DateStr,
  endDate: DateStr,
  today: DateStr,
  ideal: (date: DateStr) => number,
): Array<{ date: DateStr; actual: number; ideal: number }> {
  const last = today < endDate ? today : endDate;
  if (last < startDate) return [];
  const firstSolves = new Map<DateStr, number>();
  let before = 0;
  for (const r of rows) {
    if (!r.main || r.solveDates.length === 0) continue;
    const first = r.solveDates.reduce((a, b) => (a < b ? a : b));
    if (first < startDate) before++;
    else firstSolves.set(first, (firstSolves.get(first) ?? 0) + 1);
  }
  let running = before;
  return eachDay(startDate, last).map((date) => {
    running += firstSolves.get(date) ?? 0;
    return { date, actual: running, ideal: ideal(date) };
  });
}

/** First solves per plan week, split by difficulty. */
export function difficultyByWeek(rows: readonly SolveRow[], startDate: DateStr, today: DateStr): Array<{ week: number; Easy: number; Medium: number; Hard: number }> {
  const weeks = new Map<number, { Easy: number; Medium: number; Hard: number }>();
  const weekOf = (d: DateStr) => weekNumber(d, startDate);
  for (const r of rows) {
    if (r.solveDates.length === 0) continue;
    const first = r.solveDates.reduce((a, b) => (a < b ? a : b));
    if (first < startDate || first > today) continue;
    const w = weekOf(first);
    const bucket = weeks.get(w) ?? { Easy: 0, Medium: 0, Hard: 0 };
    bucket[r.difficulty]++;
    weeks.set(w, bucket);
  }
  const lastWeek = today < startDate ? 0 : weekOf(today);
  return Array.from({ length: lastWeek }, (_, i) => ({ week: i + 1, ...(weeks.get(i + 1) ?? { Easy: 0, Medium: 0, Hard: 0 }) }));
}

export interface QuizRow {
  date: DateStr;
  kind: "daily" | "weekly";
  bestPct: number;
  attempted: boolean;
}

/** Best score per attempted quiz, oldest first. */
export function quizTrend(rows: readonly QuizRow[]): Array<{ date: DateStr; kind: QuizRow["kind"]; pct: number }> {
  return rows
    .filter((r) => r.attempted)
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, kind: r.kind, pct: r.bestPct }));
}

/** Percentage of each group done, e.g. subtopics ticked per syllabus track. */
export function coverage<K extends string>(
  groups: ReadonlyArray<{ key: K; label: string; ids: readonly string[] }>,
  done: ReadonlySet<string>,
): Array<{ key: K; label: string; done: number; total: number; pct: number }> {
  return groups.map((g) => {
    const n = g.ids.filter((id) => done.has(id)).length;
    return { key: g.key, label: g.label, done: n, total: g.ids.length, pct: g.ids.length ? Math.round((100 * n) / g.ids.length) : 0 };
  });
}

/**
 * Mastery per topic for the radar: the topic quiz score when there is one,
 * otherwise the mean of its subtopic scores (unpractised counts as 0).
 */
export function topicMastery(
  topics: ReadonlyArray<{ id: string; title: string; subtopicIds: readonly string[] }>,
  scores: ReadonlyMap<string, number>,
  mastered: ReadonlySet<string>,
): Array<{ topicId: string; title: string; score: number; mastered: boolean }> {
  return topics.map((t) => {
    const own = scores.get(t.id);
    const subs = t.subtopicIds.map((id) => scores.get(id) ?? 0);
    const mean = subs.length ? subs.reduce((a, b) => a + b, 0) / subs.length : 0;
    return { topicId: t.id, title: t.title, score: Math.round(own ?? mean), mastered: mastered.has(t.id) };
  });
}
