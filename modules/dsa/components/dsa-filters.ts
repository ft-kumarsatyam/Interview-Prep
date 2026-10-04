import type { ContentProblem } from "@/core/content";
import type { ProgressSummary } from "@/modules/dsa/services/problems";

export const TRACKS = [
  { id: "main", label: "DSA (in JS)", short: "DSA", blurb: "Core pass first (153 must-know), then the extended set, pattern by pattern." },
  { id: "js", label: "JavaScript", short: "JS", blurb: "LeetCode 30 Days of JavaScript: closures, promises, debounce, event emitter." },
  { id: "sql", label: "SQL", short: "SQL", blurb: "Classic backend SQL questions. One a day from week 4." },
] as const;

export const DIFFICULTIES = ["all", "Easy", "Medium", "Hard"] as const;
export const STATUSES = ["all", "todo", "solved", "struggled"] as const;
export const SORTS = ["order", "recent"] as const;
export const VIEWS = ["pattern", "sheet"] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export interface DsaFilters {
  track: TrackId;
  q: string;
  difficulty: (typeof DIFFICULTIES)[number];
  status: (typeof STATUSES)[number];
  pattern: string;
  sort: (typeof SORTS)[number];
  view: (typeof VIEWS)[number];
  /** Id of a curated sheet (see data/dsa-sheets.json); "" means the whole track. Main track only. */
  list: string;
}

export const DEFAULT_FILTERS: DsaFilters = { track: "main", q: "", difficulty: "all", status: "all", pattern: "", sort: "order", view: "pattern", list: "" };

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): DsaFilters {
  return {
    track: oneOf(TRACKS.map((t) => t.id), sp.track, DEFAULT_FILTERS.track),
    q: str(sp.q, 100),
    difficulty: oneOf(DIFFICULTIES, sp.difficulty, "all"),
    status: oneOf(STATUSES, sp.status, "all"),
    pattern: str(sp.pattern, 80),
    sort: oneOf(SORTS, sp.sort, "order"),
    view: oneOf(VIEWS, sp.view, "pattern"),
    list: str(sp.list, 40),
  };
}

/** Only non-default values go in the URL, so a plain /dsa stays clean. */
export function filtersToQuery(f: DsaFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_FILTERS) as Array<keyof DsaFilters>) {
    const value = key === "q" ? f.q.trim() : f[key];
    if (value !== DEFAULT_FILTERS[key]) params.set(key, value);
  }
  return params.toString();
}

export const isSolved = (prog: ProgressSummary | undefined) => prog?.status === "solved";

/** The next problem to do in a track: core before extended, then by order. */
export function nextUnsolved(problems: readonly ContentProblem[], progress: Record<string, ProgressSummary>, track: TrackId = "main"): ContentProblem | undefined {
  return problems
    .filter((p) => p.track === track && !isSolved(progress[p.slug]))
    .toSorted((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1))[0];
}
