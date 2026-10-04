/** Pure helpers for the Learn pages: topic status, what to study next, and track navigation. */

export type TopicStatus = "todo" | "progress" | "done";

export interface LearnTopic {
  id: string;
  track: string;
  week: number;
  title: string;
  subtopics: readonly string[];
}

export interface TopicProgress {
  done: number;
  total: number;
  status: TopicStatus;
  mastered: boolean;
  /** Index of the first unticked subtopic, or null when all are ticked. */
  next: number | null;
}

const subId = (topicId: string, i: number) => `${topicId}:${i}`;

/** A topic is done once every subtopic is ticked or its quiz has been mastered. */
export function topicProgress(topic: LearnTopic, isDone: (subtopicId: string) => boolean, mastered: boolean): TopicProgress {
  const total = topic.subtopics.length;
  let done = 0;
  let next: number | null = null;
  topic.subtopics.forEach((_, i) => {
    if (isDone(subId(topic.id, i))) done++;
    else if (next === null) next = i;
  });
  const status: TopicStatus = mastered || (total > 0 && done === total) ? "done" : done > 0 ? "progress" : "todo";
  return { done, total, status, mastered, next };
}

/** Topics of one track in study order (by week, stable for ties). */
export function trackTopics<T extends LearnTopic>(topics: readonly T[], trackId: string): T[] {
  return topics.filter((t) => t.track === trackId).toSorted((a, b) => a.week - b.week);
}

/** The previous and next topic in the same track. */
export function neighbours<T extends LearnTopic>(topics: readonly T[], topicId: string): { prev: T | null; next: T | null } {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return { prev: null, next: null };
  const list = trackTopics(topics, topic.track);
  const i = list.findIndex((t) => t.id === topicId);
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

export interface ContinueInput<T extends LearnTopic> {
  /** Topics in canonical study order. */
  topics: readonly T[];
  isDone: (subtopicId: string) => boolean;
  isMastered: (topicId: string) => boolean;
  /** Latest `YYYY-MM-DD` a subtopic of the topic was ticked, if any. */
  lastTouched: (topicId: string) => string | null;
  currentWeek: number;
}

export interface ContinueTarget<T extends LearnTopic> {
  topic: T;
  reason: "recent" | "this-week" | "next";
  progress: TopicProgress;
}

/**
 * What the "Continue" card points at: the unfinished topic you touched most recently, else an unfinished
 * topic scheduled for this week, else the first unfinished topic in study order. Null when everything is done.
 */
export function continueTarget<T extends LearnTopic>(input: ContinueInput<T>): ContinueTarget<T> | null {
  const rows = input.topics.map((topic) => ({ topic, progress: topicProgress(topic, input.isDone, input.isMastered(topic.id)) }));
  const open = rows.filter((r) => r.progress.status !== "done");
  if (open.length === 0) return null;

  let recent: { row: (typeof open)[number]; at: string } | null = null;
  for (const row of open) {
    if (row.progress.status !== "progress") continue;
    const at = input.lastTouched(row.topic.id);
    if (at && (!recent || at > recent.at)) recent = { row, at };
  }
  if (recent) return { ...recent.row, reason: "recent" };

  const thisWeek = open.find((r) => r.topic.week === input.currentWeek);
  if (thisWeek) return { ...thisWeek, reason: "this-week" };

  return { ...open[0]!, reason: "next" };
}

export interface TopicMatch<T extends LearnTopic> {
  topic: T;
  /** Indices of subtopics whose title contains the query. */
  subtopics: number[];
}

/** Case-insensitive search over topic titles and subtopic titles. An empty query matches nothing. */
export function searchTopics<T extends LearnTopic>(topics: readonly T[], query: string): TopicMatch<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: TopicMatch<T>[] = [];
  for (const topic of topics) {
    const subtopics = topic.subtopics.flatMap((s, i) => (s.toLowerCase().includes(q) ? [i] : []));
    if (subtopics.length > 0 || topic.title.toLowerCase().includes(q)) out.push({ topic, subtopics });
  }
  return out;
}

/** Old Learn deep links were `/learn?track=x#topic-<id>`; returns the topic id from such a hash. */
export function topicIdFromHash(hash: string): string | null {
  const h = decodeURIComponent(hash.replace(/^#/, ""));
  return h.startsWith("topic-") && h.length > "topic-".length ? h.slice("topic-".length) : null;
}
