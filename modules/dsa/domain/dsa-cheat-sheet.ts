import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);

export const cheatSheetPatternSchema = z.object({
  pattern: text(80),
  recognitionSignal: text(300, 10),
  typicalProblems: text(240, 3),
  typicalComplexity: text(80, 2),
  firstQuestion: text(240, 10),
});

export const cheatSheetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: text(80),
  level: text(40),
  description: text(500, 20),
  patterns: z.array(cheatSheetPatternSchema).min(1),
  decisionTree: z.array(z.object({ signal: text(180, 5), thinkFirst: text(120, 2) })).min(1),
});

export const cheatSheetsSchema = z.object({ sheets: z.array(cheatSheetSchema).min(1) });
export type CheatSheet = z.infer<typeof cheatSheetSchema>;
