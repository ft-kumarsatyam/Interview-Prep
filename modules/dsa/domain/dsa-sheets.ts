import type { ContentProblem, ContentSheet } from "@/core/content";

export interface SheetSection {
  section: string;
  problems: ContentProblem[];
}

/** The sheet's problems grouped by its own sections, both kept in the author's order. Slugs that aren't in `bySlug` are skipped. */
export function sheetSections(sheet: ContentSheet, bySlug: ReadonlyMap<string, ContentProblem>, keep: (p: ContentProblem) => boolean = () => true): SheetSection[] {
  const sections = new Map<string, ContentProblem[]>();
  for (const item of sheet.items) {
    const p = bySlug.get(item.slug);
    if (!p || !keep(p)) continue;
    sections.set(item.section, [...(sections.get(item.section) ?? []), p]);
  }
  return [...sections].map(([section, problems]) => ({ section, problems }));
}

export function sheetVideos(sheet: ContentSheet): Record<string, string> {
  return Object.fromEntries(sheet.items.flatMap((i) => (i.video ? [[i.slug, i.video] as const] : [])));
}

/** First problem in the sheet's own order that isn't solved yet. */
export function nextInSheet(sheet: ContentSheet, bySlug: ReadonlyMap<string, ContentProblem>, isSolved: (slug: string) => boolean): ContentProblem | undefined {
  for (const item of sheet.items) {
    const p = bySlug.get(item.slug);
    if (p && !isSolved(p.slug)) return p;
  }
  return undefined;
}

export function sheetProgress(sheet: ContentSheet, isSolved: (slug: string) => boolean): { solved: number; total: number } {
  return { solved: sheet.items.filter((i) => isSolved(i.slug)).length, total: sheet.items.length };
}
