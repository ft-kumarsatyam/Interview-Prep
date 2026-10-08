import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const slug = z.string().regex(/^[a-z0-9-]+$/);

export const cheatSheetPatternSchema = z.object({
  pattern: text(80),
  recognitionSignal: text(300, 10),
  typicalProblems: text(240, 3),
  typicalComplexity: text(80, 2),
  firstQuestion: text(240, 10),
  /** Local problem slugs that practise this pattern. */
  examples: z.array(slug).max(4).optional(),
});

/** One step of the interview routine for a topic: what to do, the usual mistake, and problems to practise it on. */
export const cheatSheetStepSchema = z.object({
  step: z.number().int().min(1).max(9),
  action: text(160, 5),
  mistake: text(200, 5),
  practice: z.array(slug).min(1).max(4),
});

export const cheatSheetSchema = z.object({
  id: slug,
  title: text(80),
  level: text(40),
  description: text(500, 20),
  patterns: z.array(cheatSheetPatternSchema).min(1),
  decisionTree: z.array(z.object({ signal: text(180, 5), thinkFirst: text(120, 2) })).min(1),
  workflow: z.array(cheatSheetStepSchema).optional(),
});

export const cheatSheetsSchema = z.object({ sheets: z.array(cheatSheetSchema).min(1) });
export type CheatSheet = z.infer<typeof cheatSheetSchema>;
export type CheatSheetPattern = z.infer<typeof cheatSheetPatternSchema>;
export type CheatSheetStep = z.infer<typeof cheatSheetStepSchema>;

/** Every problem slug a set of cheat sheets links to (pattern examples and workflow practice). */
export function cheatSheetSlugs(sheets: readonly CheatSheet[]): string[] {
  const out = new Set<string>();
  for (const sheet of sheets) {
    for (const pattern of sheet.patterns) for (const s of pattern.examples ?? []) out.add(s);
    for (const step of sheet.workflow ?? []) for (const s of step.practice) out.add(s);
  }
  return [...out];
}
