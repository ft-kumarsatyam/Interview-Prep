/** Practice template sections, in interview order. Budgets add up to the 45-minute round. */
export const DESIGN_SECTIONS = [
  { id: "requirements", label: "Requirements", minutes: 5, hint: "Functional (3-5 bullets), non-functional (latency, availability, consistency), scale assumptions." },
  { id: "estimates", label: "Estimates", minutes: 5, hint: "QPS (avg / peak), storage over N years, bandwidth. Which number drives the design?" },
  { id: "api", label: "API", minutes: 5, hint: "Endpoints with inputs/outputs, pagination, idempotency keys, auth." },
  { id: "dataModel", label: "Data model", minutes: 5, hint: "Entities, keys, partition key, which store and why." },
  { id: "architecture", label: "High-level design", minutes: 15, hint: "Boxes and arrows in words: edge → services → stores → queues. Walk a read and a write." },
  { id: "deepDives", label: "Deep dives & trade-offs", minutes: 10, hint: "Bottlenecks, failure modes, consistency choices, what you'd monitor." },
] as const;

export type DesignSectionId = (typeof DESIGN_SECTIONS)[number]["id"];
export const DESIGN_SECTION_IDS = DESIGN_SECTIONS.map((s) => s.id) as readonly DesignSectionId[];
export const PRACTICE_MINUTES = DESIGN_SECTIONS.reduce((n, s) => n + s.minutes, 0);
export const SECTION_MAX = 20_000;
/** Below this many words a section counts as not attempted. */
export const SECTION_MIN_WORDS = 15;

export type DesignSections = Partial<Record<DesignSectionId, string>>;

export interface RubricScore {
  done: number;
  total: number;
  pct: number;
}

/** Self-review score; ids not in the rubric (e.g. after a content edit) are ignored. */
export function rubricScore(checked: readonly string[], rubricIds: readonly string[]): RubricScore {
  const valid = new Set(rubricIds);
  const done = new Set(checked.filter((id) => valid.has(id))).size;
  const total = rubricIds.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function sectionsAttempted(sections: DesignSections): number {
  return DESIGN_SECTION_IDS.filter((id) => (sections[id] ?? "").trim().split(/\s+/).filter(Boolean).length >= SECTION_MIN_WORDS).length;
}

export type DesignStatus = "new" | "studying" | "practised" | "mastered";

/**
 * Card state on /design. Mastery comes from the linked syllabus topic quiz;
 * "practised" needs a written attempt of every section and half the rubric.
 */
export function designStatus(input: {
  topicMastered: boolean;
  subtopicsDone: number;
  sectionsAttempted: number;
  rubricPct: number;
}): DesignStatus {
  if (input.topicMastered) return "mastered";
  if (input.sectionsAttempted === DESIGN_SECTION_IDS.length && input.rubricPct >= 50) return "practised";
  if (input.sectionsAttempted > 0 || input.subtopicsDone > 0) return "studying";
  return "new";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Relevance of an article to a case: whole-word keyword hits in the title
 * count 3, tag overlap counts 1 per tag. Zero means unrelated.
 */
export function articleRelevance(article: { title: string; tags: readonly string[] }, keywords: readonly string[], caseTags: readonly string[]): number {
  const title = article.title.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (new RegExp(`\\b${escapeRegExp(kw.toLowerCase())}s?\\b`).test(title)) score += 3;
  }
  for (const t of article.tags) if (caseTags.includes(t)) score += 1;
  return score;
}

/**
 * Best related articles: title keyword matches first, tag-only matches as
 * filler (two shared tags at least), newest first within a score.
 */
export function relatedArticles<T extends { title: string; tags: readonly string[]; publishedAt: string | null }>(
  articles: readonly T[],
  keywords: readonly string[],
  caseTags: readonly string[],
  limit = 6,
): T[] {
  return articles
    .map((a) => ({ a, score: articleRelevance(a, keywords, caseTags) }))
    .filter((x) => x.score >= 2)
    .toSorted((x, y) => y.score - x.score || (y.a.publishedAt ?? "").localeCompare(x.a.publishedAt ?? ""))
    .slice(0, limit)
    .map((x) => x.a);
}

/** "12:34" for a countdown; negative values show overtime as "+1:05". */
export function formatClock(seconds: number): string {
  const s = Math.abs(Math.trunc(seconds));
  const text = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return seconds < 0 ? `+${text}` : text;
}
