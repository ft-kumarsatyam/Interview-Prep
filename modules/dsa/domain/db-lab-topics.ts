/**
 * How DB Lab challenges are organised: a short list of topics per language, shown in the order a learner should meet
 * them, with helpers to group, count and find the next unsolved challenge. Pure.
 */
import type { DbChallenge, DbMode, Difficulty } from "@/modules/dsa/domain/db-lab";

export const SQL_TOPIC_IDS = ["basics", "aggregation", "joins", "subqueries", "windows", "dates-strings", "nulls-sets", "patterns"] as const;
export const MONGO_TOPIC_IDS = ["find", "arrays", "aggregation", "lookup", "patterns"] as const;
export type DbTopic = (typeof SQL_TOPIC_IDS)[number] | (typeof MONGO_TOPIC_IDS)[number];

export interface TopicInfo {
  id: DbTopic;
  label: string;
  blurb: string;
}

export const SQL_TOPICS: readonly TopicInfo[] = [
  { id: "basics", label: "Select, filter and sort", blurb: "WHERE, ORDER BY, LIMIT, DISTINCT, IN and BETWEEN." },
  { id: "aggregation", label: "Grouping and aggregates", blurb: "GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX." },
  { id: "joins", label: "Joins", blurb: "INNER and LEFT joins, self joins, anti-joins, several tables at once." },
  { id: "subqueries", label: "Subqueries and CTEs", blurb: "Scalar, correlated and EXISTS subqueries, WITH clauses." },
  { id: "windows", label: "Window functions", blurb: "RANK, ROW_NUMBER, LAG, NTILE, running totals, top-N per group." },
  { id: "dates-strings", label: "Dates and strings", blurb: "strftime, julianday, SUBSTR, UPPER, concatenation." },
  { id: "nulls-sets", label: "NULLs and set logic", blurb: "IS NULL, COALESCE, UNION, EXCEPT." },
  { id: "patterns", label: "Interview patterns", blurb: "Gaps and islands, pivots, consecutive days, recursive CTEs." },
];

export const MONGO_TOPICS: readonly TopicInfo[] = [
  { id: "find", label: "Find and filter", blurb: "find, projection, sort, comparison operators, regex." },
  { id: "arrays", label: "Arrays and embedded documents", blurb: "$size, $all, $elemMatch, matching inside arrays." },
  { id: "aggregation", label: "Aggregation pipeline", blurb: "$match, $group, $project, $sort, $limit, $unwind." },
  { id: "lookup", label: "Joins with $lookup", blurb: "$lookup, $unwind, anti-joins and joined totals." },
  { id: "patterns", label: "Interview patterns", blurb: "Top-N, conditional counting, first-per-group." },
];

export const topicsFor = (mode: DbMode): readonly TopicInfo[] => (mode === "sql" ? SQL_TOPICS : MONGO_TOPICS);
export const topicLabel = (mode: DbMode, id: DbTopic) => topicsFor(mode).find((t) => t.id === id)?.label ?? id;

export interface TopicGroup {
  topic: TopicInfo;
  challenges: DbChallenge[];
  solved: number;
}

/** Challenges grouped by topic in teaching order (easy before hard inside a topic). Topics with nothing are left out. */
export function groupByTopic(mode: DbMode, challenges: readonly DbChallenge[], solved: ReadonlySet<string>): TopicGroup[] {
  const rank: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };
  return topicsFor(mode)
    .map((topic) => {
      const list = challenges.filter((c) => c.mode === mode && c.topic === topic.id).toSorted((a, b) => rank[a.difficulty] - rank[b.difficulty]);
      return { topic, challenges: list, solved: list.filter((c) => solved.has(c.id)).length };
    })
    .filter((g) => g.challenges.length > 0);
}

export interface CatalogStats {
  total: number;
  byMode: Record<DbMode, number>;
  byDifficulty: Record<Difficulty, number>;
}

export function catalogStats(challenges: readonly DbChallenge[]): CatalogStats {
  const out: CatalogStats = { total: challenges.length, byMode: { sql: 0, mongo: 0 }, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 } };
  for (const c of challenges) {
    out.byMode[c.mode]++;
    out.byDifficulty[c.difficulty]++;
  }
  return out;
}

/** The first unsolved challenge after `currentId` in catalogue order (wrapping), or the first one when everything is solved. */
export function nextUnsolved(challenges: readonly DbChallenge[], solved: ReadonlySet<string>, currentId: string | null): DbChallenge | null {
  if (challenges.length === 0) return null;
  const from = currentId ? challenges.findIndex((c) => c.id === currentId) : -1;
  const ordered = [...challenges.slice(from + 1), ...challenges.slice(0, from + 1)];
  return ordered.find((c) => !solved.has(c.id) && c.id !== currentId) ?? ordered[0] ?? null;
}
