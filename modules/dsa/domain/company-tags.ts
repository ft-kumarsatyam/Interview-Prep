import { z } from "zod";
import type { ContentProblem } from "@/core/content";
import { matchExternalQuestion, type CompanyTag, type ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";

export const COMPANY_WINDOWS = ["d30", "d90", "d180", "all"] as const;
export type CompanyWindow = (typeof COMPANY_WINDOWS)[number];
export const COMPANY_WINDOW_LABEL: Record<CompanyWindow, string> = { d30: "30 days", d90: "3 months", d180: "6 months", all: "All time" };
const WINDOW_INDEX: Record<CompanyWindow, 0 | 1 | 2 | 3> = { d30: 0, d90: 1, d180: 2, all: 3 };

const COMPANY_REGIONS = ["global", "india"] as const;
export type CompanyRegion = (typeof COMPANY_REGIONS)[number];

const count = z.number().int().nonnegative();
const freq = z.number().nonnegative().max(100);

/**
 * data/dsa-company-tags.json, built by scripts/import-company-tags.ts from a public GitHub dataset of
 * LeetCode company tags. `tags` rows are [companyIndex, freq30d, freq3mo, freq6mo, freqAll]; 0 means absent.
 */
export const companyDatasetSchema = z.object({
  source: z.object({
    name: z.string().min(1),
    url: z.url(),
    datasetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    importedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().min(1),
  }),
  topics: z.array(z.string().min(1)),
  companies: z.array(
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(80),
      region: z.enum(COMPANY_REGIONS),
      counts: z.tuple([count, count, count, count]),
    }),
  ),
  questions: z.record(
    z.string().regex(/^[a-z0-9-]+$/),
    z.object({
      title: z.string().min(1).max(200),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      topics: z.array(z.number().int().nonnegative()),
      tags: z.array(z.tuple([z.number().int().nonnegative(), freq, freq, freq, freq])),
    }),
  ),
});
export type CompanyDataset = z.infer<typeof companyDatasetSchema>;
export type DatasetCompany = CompanyDataset["companies"][number];

export function leetcodeSlugOf(url: string): string | null {
  const match = /leetcode\.com\/problems\/([a-z0-9-]+)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

/** The LeetCode slug a local problem maps to: its URL when it has one, else its own slug. */
export function problemLeetcodeSlug(problem: Pick<ContentProblem, "slug" | "url">): string {
  return leetcodeSlugOf(problem.url) ?? problem.slug;
}

export interface CompanyFrequency {
  company: string;
  slug: string;
  region: CompanyRegion;
  frequency: number;
}

/** Companies that asked one LeetCode question in a window, most frequent first. */
export function companiesForQuestion(dataset: CompanyDataset, leetcodeSlug: string, window: CompanyWindow = "all"): CompanyFrequency[] {
  const question = dataset.questions[leetcodeSlug];
  if (!question) return [];
  const wi = WINDOW_INDEX[window] + 1;
  return question.tags
    .filter((tag) => tag[wi] > 0)
    .map((tag) => ({ company: dataset.companies[tag[0]].name, slug: dataset.companies[tag[0]].slug, region: dataset.companies[tag[0]].region, frequency: tag[wi] }))
    .toSorted((a, b) => b.frequency - a.frequency || a.company.localeCompare(b.company));
}

function companyCount(company: DatasetCompany, window: CompanyWindow): number {
  return company.counts[WINDOW_INDEX[window]];
}

/** Companies with at least one question in the window, biggest list first. */
export function topCompanies(
  dataset: CompanyDataset,
  { region, query = "", window = "all" }: { region?: CompanyRegion; query?: string; window?: CompanyWindow } = {},
): DatasetCompany[] {
  const text = query.trim().toLowerCase();
  return dataset.companies
    .filter((c) => (!region || c.region === region) && (!text || c.name.toLowerCase().includes(text)) && companyCount(c, window) > 0)
    .toSorted((a, b) => companyCount(b, window) - companyCount(a, window) || a.name.localeCompare(b.name));
}

export const COMPANY_SORTS = ["frequency", "difficulty", "title"] as const;
export type CompanySort = (typeof COMPANY_SORTS)[number];

export interface CompanyQuestion {
  leetcodeSlug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  frequency: number;
  url: string;
}

const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 } as const;

/** One company's questions in a window. */
export function companyQuestions(dataset: CompanyDataset, companySlug: string, window: CompanyWindow = "all", sort: CompanySort = "frequency"): CompanyQuestion[] {
  const ci = dataset.companies.findIndex((c) => c.slug === companySlug);
  if (ci < 0) return [];
  const wi = WINDOW_INDEX[window] + 1;
  const out: CompanyQuestion[] = [];
  for (const [leetcodeSlug, q] of Object.entries(dataset.questions)) {
    const tag = q.tags.find((t) => t[0] === ci);
    if (!tag || tag[wi] <= 0) continue;
    out.push({
      leetcodeSlug,
      title: q.title,
      difficulty: q.difficulty,
      topics: q.topics.map((t) => dataset.topics[t]),
      frequency: tag[wi],
      url: `https://leetcode.com/problems/${leetcodeSlug}/`,
    });
  }
  return sortCompanyQuestions(out, sort);
}

export function sortCompanyQuestions<T extends Pick<CompanyQuestion, "title" | "difficulty" | "frequency">>(rows: readonly T[], sort: CompanySort): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  if (sort === "title") return rows.toSorted(byTitle);
  if (sort === "difficulty") return rows.toSorted((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || b.frequency - a.frequency || byTitle(a, b));
  return rows.toSorted((a, b) => b.frequency - a.frequency || byTitle(a, b));
}

/** Company names per local problem slug (most frequent first, capped), for tables that only show a few chips. */
export function companiesByLocalSlug(
  dataset: CompanyDataset,
  problems: readonly Pick<ContentProblem, "slug" | "url">[],
  { window = "all", limit = 12 }: { window?: CompanyWindow; limit?: number } = {},
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const problem of problems) {
    const names = companiesForQuestion(dataset, problemLeetcodeSlug(problem), window).map((c) => c.company);
    const fallback = names.length ? names : [...(COMPANY_BY_SLUG[problem.slug] ?? [])];
    if (fallback.length) out[problem.slug] = fallback.slice(0, limit);
  }
  return out;
}

/** Local problem slug for each dataset question that PrepOS can open in its own IDE. */
export function localSlugByLeetcode(problems: readonly Pick<ContentProblem, "slug" | "url">[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const problem of problems) {
    const lc = problemLeetcodeSlug(problem);
    if (!out.has(lc)) out.set(lc, problem.slug);
  }
  return out;
}

/**
 * Fallback tags from public interview lists (NeetCode / Blind 75 style), used only when the dataset has no
 * entry for a problem. Medium confidence: commonly reported, not a company's official question bank.
 */
export const COMPANY_BY_SLUG: Record<string, readonly string[]> = {
  "two-sum": ["Amazon", "Google", "Microsoft", "Meta", "Apple", "Bloomberg"],
  "contains-duplicate": ["Amazon", "Apple", "Microsoft"],
  "product-of-array-except-self": ["Amazon", "Meta", "Apple", "Microsoft"],
  "maximum-subarray": ["Amazon", "Microsoft", "Apple", "Bloomberg"],
  "maximum-product-subarray": ["Amazon", "Microsoft", "LinkedIn"],
  "3sum": ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Adobe"],
  "container-with-most-water": ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
  "trapping-rain-water": ["Amazon", "Google", "Apple", "Microsoft"],
  "group-anagrams": ["Amazon", "Uber", "Microsoft"],
  "top-k-frequent-elements": ["Amazon", "Meta", "Google"],
  "longest-consecutive-sequence": ["Google", "Amazon", "Microsoft"],
  "valid-anagram": ["Amazon", "Microsoft"],
  "two-sum-ii-input-array-is-sorted": ["Amazon", "Adobe"],
  "3sum-closest": ["Amazon", "Google"],
  "longest-substring-without-repeating-characters": ["Amazon", "Google", "Microsoft", "Bloomberg"],
  "longest-repeating-character-replacement": ["Amazon", "Google"],
  "minimum-window-substring": ["Facebook", "Uber", "LinkedIn", "Google"],
  "find-all-anagrams-in-a-string": ["Amazon", "Microsoft"],
  "sliding-window-maximum": ["Amazon", "Google"],
  "valid-parentheses": ["Amazon", "Microsoft", "Google", "Bloomberg"],
  "min-stack": ["Amazon", "Bloomberg", "Microsoft"],
  "daily-temperatures": ["Amazon", "Google"],
  "largest-rectangle-in-histogram": ["Amazon", "Google", "Microsoft"],
  "binary-search": ["Amazon", "Microsoft"],
  "search-in-rotated-sorted-array": ["Amazon", "Microsoft", "Facebook", "Bloomberg"],
  "find-minimum-in-rotated-sorted-array": ["Amazon", "Microsoft"],
  "koko-eating-bananas": ["Google", "Amazon"],
  "median-of-two-sorted-arrays": ["Amazon", "Google", "Microsoft", "Apple"],
  "reverse-linked-list": ["Amazon", "Microsoft", "Apple", "Adobe"],
  "merge-two-sorted-lists": ["Amazon", "Microsoft", "Apple"],
  "linked-list-cycle": ["Amazon", "Microsoft", "Bloomberg"],
  "reorder-list": ["Amazon", "Microsoft"],
  "remove-nth-node-from-end-of-list": ["Amazon", "Microsoft"],
  "merge-k-sorted-lists": ["Amazon", "Google", "Microsoft", "Facebook"],
  "lru-cache": ["Amazon", "Microsoft", "Google", "Bloomberg", "Uber"],
  "invert-binary-tree": ["Google", "Amazon"],
  "maximum-depth-of-binary-tree": ["Amazon", "Microsoft", "LinkedIn"],
  "diameter-of-binary-tree": ["Amazon", "Google", "Facebook"],
  "balanced-binary-tree": ["Amazon", "Microsoft"],
  "same-tree": ["Amazon", "Bloomberg"],
  "subtree-of-another-tree": ["Amazon", "Microsoft"],
  "lowest-common-ancestor-of-a-binary-search-tree": ["Amazon", "Facebook", "Microsoft"],
  "lowest-common-ancestor-of-a-binary-tree": ["Amazon", "Facebook", "Microsoft"],
  "binary-tree-level-order-traversal": ["Amazon", "Microsoft", "Bloomberg", "LinkedIn"],
  "validate-binary-search-tree": ["Amazon", "Microsoft", "Facebook", "Bloomberg"],
  "kth-smallest-element-in-a-bst": ["Amazon", "Google"],
  "construct-binary-tree-from-preorder-and-inorder-traversal": ["Amazon", "Microsoft"],
  "serialize-and-deserialize-binary-tree": ["Amazon", "Microsoft", "LinkedIn"],
  "implement-trie-prefix-tree": ["Amazon", "Google", "Microsoft"],
  "design-add-and-search-words-data-structure": ["Facebook", "Amazon"],
  "word-search-ii": ["Amazon", "Microsoft", "Airbnb"],
  "kth-largest-element-in-an-array": ["Amazon", "Facebook", "Microsoft"],
  "last-stone-weight": ["Amazon"],
  "k-closest-points-to-origin": ["Amazon", "Facebook"],
  "task-scheduler": ["Facebook", "Amazon"],
  "find-median-from-data-stream": ["Amazon", "Google", "Microsoft"],
  "jump-game": ["Amazon", "Microsoft"],
  "jump-game-ii": ["Amazon", "Microsoft"],
  "gas-station": ["Amazon", "Microsoft"],
  "hand-of-straights": ["Google"],
  "merge-intervals": ["Amazon", "Google", "Microsoft", "Facebook", "Bloomberg"],
  "insert-interval": ["Google", "Amazon", "Facebook"],
  "non-overlapping-intervals": ["Amazon", "Microsoft"],
  "number-of-islands": ["Amazon", "Google", "Microsoft", "Facebook", "Bloomberg"],
  "clone-graph": ["Amazon", "Facebook", "Google"],
  "max-area-of-island": ["Amazon", "Google"],
  "pacific-atlantic-water-flow": ["Google", "Amazon"],
  "course-schedule": ["Amazon", "Google", "Microsoft"],
  "course-schedule-ii": ["Amazon", "Google"],
  "word-ladder": ["Amazon", "Google", "Facebook"],
  "rotting-oranges": ["Amazon", "Microsoft"],
  "climbing-stairs": ["Amazon", "Adobe", "Apple"],
  "house-robber": ["Amazon", "Microsoft", "Airbnb"],
  "house-robber-ii": ["Amazon", "Microsoft"],
  "longest-palindromic-substring": ["Amazon", "Microsoft", "Bloomberg"],
  "palindromic-substrings": ["Facebook", "Amazon"],
  "decode-ways": ["Amazon", "Facebook", "Google"],
  "coin-change": ["Amazon", "Microsoft", "Bloomberg"],
  "word-break": ["Amazon", "Facebook", "Google", "Bloomberg"],
  "longest-increasing-subsequence": ["Microsoft", "Amazon", "Google"],
  "unique-paths": ["Amazon", "Google", "Bloomberg"],
  "longest-common-subsequence": ["Amazon", "Google"],
  "best-time-to-buy-and-sell-stock-with-cooldown": ["Google", "Amazon"],
  "coin-change-ii": ["Amazon", "Microsoft"],
  "target-sum": ["Facebook", "Amazon"],
  "interleaving-string": ["Amazon", "Google"],
  "edit-distance": ["Amazon", "Google", "Microsoft"],
  "burst-balloons": ["Google", "Amazon"],
  "distinct-subsequences": ["Google", "Amazon"],
  "single-number": ["Amazon", "Microsoft", "Airbnb"],
  "number-of-1-bits": ["Amazon", "Microsoft"],
  "counting-bits": ["Amazon", "Microsoft"],
  "reverse-bits": ["Amazon", "Apple"],
  "missing-number": ["Amazon", "Microsoft"],
  "sum-of-two-integers": ["Facebook", "Amazon"],
  subsets: ["Amazon", "Facebook", "Bloomberg"],
  "combination-sum": ["Amazon", "Uber", "Snapchat"],
  permutations: ["Amazon", "Microsoft", "LinkedIn"],
  "subsets-ii": ["Amazon", "Facebook"],
  "combination-sum-ii": ["Amazon", "Snapchat"],
  "word-search": ["Amazon", "Microsoft", "Bloomberg"],
  "palindrome-partitioning": ["Amazon", "Bloomberg"],
  "letter-combinations-of-a-phone-number": ["Amazon", "Microsoft", "Facebook"],
  "n-queens": ["Amazon", "Microsoft"],
  "rotate-image": ["Amazon", "Microsoft", "Apple"],
  "spiral-matrix": ["Amazon", "Microsoft", "Apple"],
  "set-matrix-zeroes": ["Amazon", "Microsoft"],
  "happy-number": ["Amazon", "Airbnb"],
  "plus-one": ["Google", "Amazon"],
  "powx-n": ["Facebook", "Amazon", "Bloomberg"],
  "detect-squares": ["Google"],
};

const FALLBACK_SOURCE = "https://neetcode.io/practice";

/**
 * Company tags for a local problem: the dataset first (by its LeetCode slug), the NeetCode list when the
 * dataset has nothing.
 */
const MAX_ROW_COMPANIES = 12;

function companyTagsForSlug(slug: string, dataset?: CompanyDataset, problem?: Pick<ContentProblem, "slug" | "url">): CompanyTag[] {
  if (dataset) {
    const fromDataset = companiesForQuestion(dataset, problem ? problemLeetcodeSlug(problem) : slug);
    if (fromDataset.length) {
      // The dataset source and date are shown once per page; a row carries only its most frequent companies.
      return fromDataset.slice(0, MAX_ROW_COMPANIES).map(({ company }) => ({ company, confidence: "medium" as const, sourceKind: "leetcode" as const }));
    }
  }
  return (COMPANY_BY_SLUG[slug] ?? []).map((company) => ({
    company,
    confidence: "medium" as const,
    sourceKind: "other" as const,
    sourceUrl: FALLBACK_SOURCE,
    lastVerified: "2026-10-07",
  }));
}

/** Fills an empty company list from a matched local problem. Existing tags are kept. */
export function attachCompanyTags(question: ExternalQuestion, problems: readonly ContentProblem[], dataset?: CompanyDataset): ExternalQuestion {
  if (question.companies.length > 0) return question;
  const slug = matchExternalQuestion(question, problems) ?? question.localSlug;
  const problem = slug ? problems.find((p) => p.slug === slug) : undefined;
  let companies = slug ? companyTagsForSlug(slug, dataset, problem) : [];
  if (!companies.length && dataset) {
    const linked = question.links.map((link) => leetcodeSlugOf(link.url)).find((lc): lc is string => lc !== null);
    if (linked) companies = companyTagsForSlug(linked, dataset);
  }
  return companies.length ? { ...question, companies } : question;
}

export function companyNames(questions: readonly ExternalQuestion[]): string[] {
  return [...new Set(questions.flatMap((question) => question.companies.map((tag) => tag.company)))].toSorted();
}
