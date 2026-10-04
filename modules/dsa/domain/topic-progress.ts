/** Per-topic progress for /problems: one entry per main-track pattern, then the JS and SQL tracks. Pure. */
import type { ContentProblem, Difficulty } from "@/core/content";

export interface TopicProgress {
  /** Pattern name, or the track label for JS and SQL. */
  topic: string;
  /** Query for the matching /dsa list. */
  query: string;
  total: number;
  solved: number;
  core: number;
  coreSolved: number;
  difficulty: Record<Difficulty, { total: number; solved: number }>;
  /** The next unsolved problem in sheet order. */
  next: Pick<ContentProblem, "slug" | "title" | "difficulty"> | null;
  /** Your own (AI or pasted) problems tagged with this topic. */
  custom: number;
}

const TRACK_TOPICS = [
  { track: "js", topic: "JavaScript" },
  { track: "sql", topic: "SQL" },
] as const;

function summarise(topic: string, query: string, list: readonly ContentProblem[], solved: ReadonlySet<string>, custom: number): TopicProgress {
  const difficulty: TopicProgress["difficulty"] = { Easy: { total: 0, solved: 0 }, Medium: { total: 0, solved: 0 }, Hard: { total: 0, solved: 0 } };
  let done = 0;
  let core = 0;
  let coreSolved = 0;
  let next: TopicProgress["next"] = null;
  for (const p of list.toSorted((a, b) => a.order - b.order)) {
    const isSolved = solved.has(p.slug);
    difficulty[p.difficulty].total++;
    if (isSolved) {
      done++;
      difficulty[p.difficulty].solved++;
    } else if (!next) next = { slug: p.slug, title: p.title, difficulty: p.difficulty };
    if (p.tier === "core") {
      core++;
      if (isSolved) coreSolved++;
    }
  }
  return { topic, query, total: list.length, solved: done, core, coreSolved, difficulty, next, custom };
}

export function topicProgress(
  problems: readonly ContentProblem[],
  solved: ReadonlySet<string>,
  customTopics: readonly string[] = [],
): TopicProgress[] {
  const customBy = new Map<string, number>();
  for (const t of customTopics) customBy.set(t.toLowerCase(), (customBy.get(t.toLowerCase()) ?? 0) + 1);

  const byPattern = new Map<string, ContentProblem[]>();
  for (const p of problems.filter((x) => x.track === "main").toSorted((a, b) => a.order - b.order)) {
    byPattern.set(p.pattern, [...(byPattern.get(p.pattern) ?? []), p]);
  }
  const patterns = [...byPattern].map(([pattern, list]) =>
    summarise(pattern, `pattern=${encodeURIComponent(pattern)}`, list, solved, customBy.get(pattern.toLowerCase()) ?? 0),
  );
  const tracks = TRACK_TOPICS.flatMap(({ track, topic }) => {
    const list = problems.filter((p) => p.track === track);
    return list.length > 0 ? [summarise(topic, `track=${track}`, list, solved, customBy.get(topic.toLowerCase()) ?? 0)] : [];
  });
  return [...patterns, ...tracks];
}
