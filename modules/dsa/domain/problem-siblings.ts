import { problems, type ContentProblem } from "@/core/content";
import type { ExternalSheet } from "@/modules/dsa/domain/external-catalogue";

/** Same-pattern problems in plan order (core before extended), for prev/next navigation. */
export function siblingsOf(problem: ContentProblem): ContentProblem[] {
  return problems
    .filter((p) => p.track === problem.track && p.pattern === problem.pattern)
    .toSorted((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1));
}

export interface SheetContext {
  sheet: ExternalSheet;
  section: string;
  /** In-app problems of that section in sheet order, each once. */
  siblings: ContentProblem[];
}

/**
 * Where a problem opened from a sheet sits in it: the section (the one asked for, else the first that holds the
 * problem) and that section's problems for prev/next. Undefined when the problem isn't on the sheet.
 */
export function sheetContextOf(
  sheet: ExternalSheet | undefined,
  slug: string,
  wantedSection: string,
  bySlug: ReadonlyMap<string, ContentProblem>,
): SheetContext | undefined {
  if (!sheet) return undefined;
  const holding = sheet.questions.filter((q) => q.localSlug === slug);
  if (holding.length === 0) return undefined;
  const section = holding.some((q) => q.section === wantedSection) ? wantedSection : holding[0]!.section;
  const seen = new Set<string>();
  const siblings = sheet.questions.flatMap((q) => {
    if (q.section !== section || !q.localSlug || seen.has(q.localSlug)) return [];
    seen.add(q.localSlug);
    const p = bySlug.get(q.localSlug);
    return p ? [p] : [];
  });
  return { sheet, section, siblings };
}
