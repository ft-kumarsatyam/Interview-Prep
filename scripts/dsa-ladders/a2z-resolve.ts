/**
 * Resolves an external sheet row (Striver A2Z, the Array Learning sheet, GFG 160) to the PrepOS problem that opens
 * it in-app: a manual override, then the LeetCode problem its link names, then an extra whose source page is the
 * row's takeUforward practice page.
 */
import { problemBySlug, testcaseBySlug } from "@/core/content";
import type { ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";

/** Rows whose own link doesn't name the right PrepOS problem (duplicates of a ladder problem, renamed items). */
export const A2Z_OVERRIDES: Readonly<Record<string, string>> = {
  "a2z-072": "left-rotate-array-by-one",
  // Pascal's Triangle III (the first n rows) is LeetCode 118.
  "a2z-085": "pascals-triangle",
  "array-18": "pascals-triangle",
  // Its only link is LeetCode's premium "find-the-celebrity".
  "a2z-273": "celebrity-problem",
  // LeetCode 237 hands you the node, not the head; A2Z means deleting the head.
  "a2z-166": "deletion-of-the-head-of-ll",
  // Its LeetCode link is the singly linked reversal.
  "a2z-185": "reverse-a-doubly-linked-list",
  // LeetCode 142 returns a node; the PrepOS judge asks for its position.
  "a2z-197": "starting-point-of-loop-in-ll",
};

const TUF_PRACTICE = "https://takeuforward.org/practice/dsa/";

export function leetcodeSlugOf(question: Pick<ExternalQuestion, "links">): string | undefined {
  for (const link of question.links) {
    const match = /^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)/.exec(link.url);
    if (match) return match[1];
  }
  return undefined;
}

export function tufSlugOf(question: Pick<ExternalQuestion, "links">): string | undefined {
  const link = question.links.find((item) => item.url.startsWith(TUF_PRACTICE));
  return link ? link.url.slice(TUF_PRACTICE.length).replace(/\/$/, "") : undefined;
}

const byTufSlug = new Map<string, string>();
for (const problem of problemBySlug.values()) {
  if (problem.url.startsWith(TUF_PRACTICE)) byTufSlug.set(problem.url.slice(TUF_PRACTICE.length).replace(/\/$/, ""), problem.slug);
}

const normalize = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function resolveLocalSlug(question: Pick<ExternalQuestion, "id" | "links" | "title">): string | undefined {
  const override = A2Z_OVERRIDES[question.id];
  if (override) return override;
  const lc = leetcodeSlugOf(question);
  if (lc && problemBySlug.has(lc)) return lc;
  const tuf = tufSlugOf(question);
  if (tuf && byTufSlug.has(tuf)) return byTufSlug.get(tuf);
  // takeUforward reuses LeetCode's slug for LeetCode problems it hosts; trust that only when the titles agree too.
  const same = tuf ? problemBySlug.get(tuf) : undefined;
  if (same && normalize(same.title) === normalize(question.title)) return same.slug;
  return undefined;
}

export function hasJudge(slug: string): boolean {
  return problemBySlug.has(slug) && testcaseBySlug.has(slug);
}
