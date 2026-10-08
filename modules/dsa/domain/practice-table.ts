import type { ContentProblem, ContentSheet, Difficulty } from "@/core/content";
import { companiesForQuestion, problemLeetcodeSlug, type CompanyDataset, COMPANY_BY_SLUG } from "@/modules/dsa/domain/company-tags";
import type { ExternalSheet } from "@/modules/dsa/domain/external-catalogue";

export const LEVELS = ["Basic", "Core", "Pro"] as const;
export type Level = (typeof LEVELS)[number];

const LEVEL_BY_DIFFICULTY: Record<Difficulty, Level> = { Easy: "Basic", Medium: "Core", Hard: "Pro" };

/** takeUforward-style level: Easy is Basic, Medium is Core, Hard is Pro. */
export function levelOf(problem: Pick<ContentProblem, "difficulty">): Level {
  return LEVEL_BY_DIFFICULTY[problem.difficulty];
}

export interface PracticeRow {
  slug: string;
  /** 1-based position in the default order. */
  number: number;
  title: string;
  level: Level;
  pattern: string;
  /** LeetCode topic tags when the dataset has them, otherwise the PrepOS pattern. */
  topics: string[];
  /** Most frequent first; the company filter matches against this list. */
  companies: string[];
  companyCount: number;
  /** Sum of all-time frequency across companies: the "asked frequency" sort key. */
  asked: number;
  url: string;
  video?: string;
  article?: string;
}

export interface RowResources {
  video?: string;
  article?: string;
}

/** A walkthrough video and an article per problem, collected from the curated and external sheets. */
export function rowResources(
  sheets: readonly Pick<ContentSheet, "items">[],
  externalSheets: readonly Pick<ExternalSheet, "questions">[],
): Record<string, RowResources> {
  const out: Record<string, RowResources> = {};
  const set = (slug: string, key: keyof RowResources, url: string) => {
    out[slug] ??= {};
    out[slug][key] ??= url;
  };
  for (const sheet of sheets) for (const item of sheet.items) if (item.video) set(item.slug, "video", item.video);
  for (const sheet of externalSheets) {
    for (const q of sheet.questions) {
      if (!q.localSlug) continue;
      for (const link of q.links) {
        if (link.scope !== "item") continue;
        if (link.kind === "video") set(q.localSlug, "video", link.url);
        if (link.kind === "article") set(q.localSlug, "article", link.url);
      }
    }
  }
  return out;
}

/** Builds table rows for the main DSA track in plan order. */
export function buildPracticeRows(
  problems: readonly ContentProblem[],
  dataset: CompanyDataset,
  resources: Readonly<Record<string, RowResources>> = {},
  companyLimit = 80,
): PracticeRow[] {
  return problems
    .filter((p) => p.track === "main")
    .toSorted((a, b) => a.order - b.order)
    .map((p, i) => {
      const lc = problemLeetcodeSlug(p);
      const tags = companiesForQuestion(dataset, lc);
      const names = tags.length ? tags.map((t) => t.company) : [...(COMPANY_BY_SLUG[p.slug] ?? [])];
      const question = dataset.questions[lc];
      const topics = question?.topics.length ? question.topics.map((t) => dataset.topics[t]) : [p.pattern];
      return {
        slug: p.slug,
        number: i + 1,
        title: p.title,
        level: levelOf(p),
        pattern: p.pattern,
        topics,
        companies: names.slice(0, companyLimit),
        companyCount: names.length,
        asked: Math.round(tags.reduce((sum, t) => sum + t.frequency, 0)),
        url: p.url,
        ...resources[p.slug],
      };
    });
}

const TABLE_SORTS = ["order", "frequency", "companies", "shuffle"] as const;
export type TableSort = (typeof TABLE_SORTS)[number];
const TABLE_STATUSES = ["all", "todo", "solved", "bookmarked"] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export interface TableFilters {
  q: string;
  level: Level | "all";
  status: TableStatus;
  company: string;
  topic: string;
  sort: TableSort;
}

export const DEFAULT_TABLE_FILTERS: TableFilters = { q: "", level: "all", status: "all", company: "", topic: "", sort: "order" };

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** Table filters live under t-prefixed keys so they never clash with the by-topic browser's filters. */
export function parseTableFilters(sp: Record<string, string | string[] | undefined>): TableFilters {
  return {
    q: str(sp.tq, 100),
    level: oneOf(["all", ...LEVELS], sp.tlevel, "all"),
    status: oneOf(TABLE_STATUSES, sp.tstatus, "all"),
    company: str(sp.tco, 80),
    topic: str(sp.ttopic, 80),
    sort: oneOf(TABLE_SORTS, sp.tsort, "order"),
  };
}

export function tableFiltersToPatch(f: TableFilters): Record<string, string | null> {
  const value = (key: keyof TableFilters, param: string) => {
    const v = f[key].trim();
    return [param, v && v !== DEFAULT_TABLE_FILTERS[key] ? v : null] as const;
  };
  return Object.fromEntries([value("q", "tq"), value("level", "tlevel"), value("status", "tstatus"), value("company", "tco"), value("topic", "ttopic"), value("sort", "tsort")]);
}

export function filterRows(
  rows: readonly PracticeRow[],
  f: TableFilters,
  ctx: { solved: ReadonlySet<string>; bookmarks: ReadonlySet<string> },
): PracticeRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (q && !row.title.toLowerCase().includes(q) && !row.topics.some((t) => t.toLowerCase().includes(q)) && String(row.number) !== q) return false;
    if (f.level !== "all" && row.level !== f.level) return false;
    if (f.status === "solved" && !ctx.solved.has(row.slug)) return false;
    if (f.status === "todo" && ctx.solved.has(row.slug)) return false;
    if (f.status === "bookmarked" && !ctx.bookmarks.has(row.slug)) return false;
    if (f.company && !row.companies.includes(f.company)) return false;
    if (f.topic && !row.topics.includes(f.topic)) return false;
    return true;
  });
}

/** Deterministic shuffle so a re-render keeps the same order until the seed changes. */
function seededOrder(slug: string, seed: number): number {
  let h = seed | 0;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 2654435761);
  return h >>> 0;
}

export function sortRows(rows: readonly PracticeRow[], sort: TableSort, seed = 1): PracticeRow[] {
  if (sort === "frequency") return rows.toSorted((a, b) => b.asked - a.asked || a.number - b.number);
  if (sort === "companies") return rows.toSorted((a, b) => b.companyCount - a.companyCount || a.number - b.number);
  if (sort === "shuffle") return rows.toSorted((a, b) => seededOrder(a.slug, seed) - seededOrder(b.slug, seed));
  return rows.toSorted((a, b) => a.number - b.number);
}

/** The POTD row first, the rest in the given order. */
export function pinFirst(rows: readonly PracticeRow[], slug: string | null | undefined): PracticeRow[] {
  if (!slug) return [...rows];
  const pinned = rows.find((row) => row.slug === slug);
  return pinned ? [pinned, ...rows.filter((row) => row.slug !== slug)] : [...rows];
}

export interface LevelProgress {
  solved: number;
  total: number;
  byLevel: Record<Level, { solved: number; total: number }>;
}

export function levelProgress(rows: readonly Pick<PracticeRow, "slug" | "level">[], solved: ReadonlySet<string>): LevelProgress {
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, { solved: 0, total: 0 }])) as LevelProgress["byLevel"];
  for (const row of rows) {
    byLevel[row.level].total++;
    if (solved.has(row.slug)) byLevel[row.level].solved++;
  }
  return { solved: LEVELS.reduce((s, l) => s + byLevel[l].solved, 0), total: rows.length, byLevel };
}

/** Topic names across rows, most common first. */
export function topicOptions(rows: readonly PracticeRow[], limit = 40): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const t of row.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([t]) => t);
}
