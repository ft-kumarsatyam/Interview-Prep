import { splitCsvLine } from "@/modules/dsa/domain/company-csv";
import { leetcodeSlugOf } from "@/modules/dsa/domain/company-tags";
import type { ExternalDifficulty } from "@/modules/dsa/domain/external-catalogue";

/** One question read from a public sheet, before it is matched to a PrepOS problem. */
export interface ImportedItem {
  section: string;
  title: string;
  url: string;
  difficulty?: ExternalDifficulty;
  /** Company names as the sheet lists them. */
  companies?: string[];
  video?: string;
  remark?: string;
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);
const ROMAN = /^(ii|iii|iv|vi|vii|viii|ix)$/i;

export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => {
      if (ROMAN.test(word)) return word.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** "DYNAMIC PROGRAMING " -> "Dynamic Programming"; short acronyms (BFS, DFS) and mixed case stay as written. */
export function sectionName(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  const named = text.length <= 3 || text !== text.toUpperCase() ? text : titleCase(text);
  return named.replace(/\bPrograming\b/i, "Programming");
}

/**
 * A readable title from a problem URL: the LeetCode title when `titles` knows the slug, else the last path
 * segment with GfG's numeric suffixes removed.
 */
export function titleFromUrl(url: string, titles: (leetcodeSlug: string) => string | undefined = () => undefined): string {
  const lc = leetcodeSlugOf(url);
  if (lc) return titles(lc) ?? titleCase(lc.replace(/-/g, " "));
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const parts = parsed.pathname.split("/").filter((p) => p && !/^\d+$/.test(p));
  const problemsAt = parts.indexOf("problems");
  const segment = (problemsAt >= 0 ? parts[problemsAt + 1] : parts.at(-1)) ?? parsed.hostname;
  const cleaned = decodeURIComponent(segment)
    .replace(/\.(html?|php)$/i, "")
    .replace(/-?\d{3,}$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return cleaned ? titleCase(cleaned) : parsed.hostname;
}

const PROBLEM_URL = /https?:\/\/(?:leetcode\.com|practice\.geeksforgeeks\.org|www\.geeksforgeeks\.org|geeksforgeeks\.org|www\.spoj\.com|www\.interviewbit\.com|www\.codingninjas\.com|www\.naukri\.com\/code360)\/[^\s,\]"]+/i;
const VIDEO_URL = /https?:\/\/(?:youtu\.be|www\.youtube\.com)\/[^\s,"]+/i;

function difficultyWord(text: string): ExternalDifficulty | undefined {
  const word = /^(easy|medium|hard)\b/i.exec(text.trim())?.[1]?.toLowerCase();
  return word === "easy" ? "Easy" : word === "medium" ? "Medium" : word === "hard" ? "Hard" : undefined;
}

function cleanUrl(url: string): string {
  return url.trim().replace(/[)\].]+$/, "");
}

function dedupe(items: ImportedItem[]): ImportedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.section}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Love Babbar's 450 list as published by the 450dsa.com project: `{ Sheet1: [{ "Topic:", "Problem: ", URL }] }`. */
export function parseBabbarJson(data: unknown): ImportedItem[] {
  const rows = (data as { Sheet1?: unknown }).Sheet1;
  if (!Array.isArray(rows)) throw new Error("expected { Sheet1: [...] }");
  const items: ImportedItem[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    const section = String(row["Topic:"] ?? "").trim();
    const title = String(row["Problem: "] ?? "").replace(/\s+/g, " ").trim();
    const url = cleanUrl(String(row.URL ?? ""));
    if (!section || !title || !/^https?:\/\//.test(url)) continue;
    items.push({ section, title: title.slice(0, 240), url });
  }
  return dedupe(items);
}

/** Arsh Goyal's sheet: section rows (",Arrays ,,,") then question rows ("Easy,https://...,..."). */
export function parseArshCsv(text: string): ImportedItem[] {
  const items: ImportedItem[] = [];
  let section = "";
  let started = false;
  for (const line of text.split(/\r?\n/)) {
    const cells = splitCsvLine(line);
    if (cells[2]?.trim() === "Status") {
      started = true;
      continue;
    }
    if (!started) continue;
    const url = PROBLEM_URL.exec(cells[1] ?? "")?.[0];
    if (url) {
      if (section) items.push({ section, title: "", url: cleanUrl(url), difficulty: difficultyWord(cells[0] ?? "") ?? "Medium" });
      continue;
    }
    const label = (cells[1] ?? "").trim();
    if (!cells[0]?.trim() && label && !/https?:/.test(label)) section = sectionName(label);
  }
  return dedupe(items);
}

/**
 * Fraz's sheet: upper-case section rows (",ARRAYS,"), difficulty rows (",EASY,"), and question rows whose first
 * cell holds a problem URL (sometimes after a "12- " lesson number) with an optional editorial video next to it.
 */
export function parseFrazCsv(text: string): ImportedItem[] {
  const items: ImportedItem[] = [];
  let section = "";
  let difficulty: ExternalDifficulty | undefined;
  for (const line of text.split(/\r?\n/)) {
    const cells = splitCsvLine(line);
    const first = (cells[1] ?? "").trim();
    const second = (cells[2] ?? "").trim();
    const url = PROBLEM_URL.exec(first)?.[0];
    if (url) {
      if (!section) continue;
      const video = VIDEO_URL.exec(second)?.[0];
      items.push({ section, title: "", url: cleanUrl(url), ...(difficulty ? { difficulty } : {}), ...(video ? { video: cleanUrl(video) } : {}) });
      continue;
    }
    const level = difficultyWord(first);
    if (level && /^(easy|medium|hard)\s*(\/\s*(medium|hard))?$/i.test(first)) {
      difficulty = level;
      continue;
    }
    if (/^[A-Za-z][A-Za-z &/]{1,30}$/.test(first) && (second === "" || /^editorials?$/i.test(second))) {
      section = sectionName(first);
      difficulty = undefined;
    }
  }
  return dedupe(items);
}

interface GridCell {
  text: string;
  fill?: number;
  link?: string;
}
export type Grid = Record<string, GridCell>[];

/**
 * Apna College's sheet read from its XLSX export: the legend rows map a fill colour to Easy/Medium/Hard, then
 * rows under the "Topics" header are Topic | Question (hyperlinked) | Companies | Remarks, coloured by difficulty.
 */
export function parseApnaGrid(rows: Grid): ImportedItem[] {
  const legend = new Map<number, ExternalDifficulty>();
  const items: ImportedItem[] = [];
  let started = false;
  for (const row of rows) {
    const topic = row.A?.text.trim() ?? "";
    if (!started) {
      const level = difficultyWord(topic);
      if (level && row.A?.fill !== undefined && topic.length <= 6) legend.set(row.A.fill, level);
      if (topic === "Topics") started = true;
      continue;
    }
    const question = row.B;
    const link = question?.link ?? row.A?.link;
    if (!topic || !question?.text.trim() || !link) continue;
    const companies = row.C?.text.trim();
    const remark = row.D?.text.replace(/\s+/g, " ").trim();
    items.push({
      section: topic,
      title: question.text.replace(/\s+/g, " ").trim().slice(0, 240),
      url: cleanUrl(link),
      difficulty: legend.get(row.A?.fill ?? -1) ?? legend.get(question.fill ?? -1) ?? "Medium",
      ...(companies ? { companies: [companies] } : {}),
      ...(remark ? { remark: remark.slice(0, 300) } : {}),
    });
  }
  return dedupe(items);
}

/**
 * Splits a free-text company cell ("ABCO Accolite Amazon Goldman Sachs") into known company names, longest
 * match first, so multi-word names survive. Unknown words are dropped.
 */
export function matchCompanyNames(text: string, known: readonly string[]): string[] {
  const words = text.replace(/[+,/|]/g, " ").split(/\s+/).filter(Boolean);
  const byLower = new Map(known.map((name) => [name.toLowerCase(), name]));
  const maxWords = Math.max(1, ...known.map((name) => name.split(/\s+/).length));
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    let matched = 0;
    for (let n = Math.min(maxWords, words.length - i); n >= 1; n--) {
      const name = byLower.get(words.slice(i, i + n).join(" ").toLowerCase());
      if (name) {
        if (!out.includes(name)) out.push(name);
        matched = n;
        break;
      }
    }
    i += matched || 1;
  }
  return out;
}
