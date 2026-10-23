/**
 * Schemas and constants for the GenAI weekly tests: the authored level MCQs (data/genai-test/mcq), the
 * week-to-level map and the written-answer grade. Pure.
 */
import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);

export const TEST_KINDS = ["weekly", "cumulative", "level"] as const;
export type TestKind = (typeof TEST_KINDS)[number];

export const levelMcqSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    node: z.string().regex(/^m\d+-\d+$/),
    level: z.number().int().min(0).max(15),
    q: text(300, 10),
    options: z.array(text(200)).min(3).max(4),
    answer: z.number().int().min(0).max(3),
    why: text(400, 10),
  })
  .refine((m) => m.answer < m.options.length, "answer must index an option");
export type LevelMcq = z.infer<typeof levelMcqSchema>;

export const weekMapSchema = z.object({
  weeks: z.array(z.object({ week: z.string().regex(/^w\d{2}$/), levels: z.array(z.number().int().min(0).max(15)), focus: text(160, 3) })).min(1),
});
export type WeekMap = z.infer<typeof weekMapSchema>;

/** The four written-answer criteria, each scored 0-4. */
export const CRITERIA = [
  { id: "accuracy", label: "Accuracy" },
  { id: "completeness", label: "Covers the key points" },
  { id: "reasoning", label: "Reasoning and trade-offs" },
  { id: "clarity", label: "Clarity" },
] as const;
export const RUBRIC_MAX = 4;

export const gradeSchema = z.object({
  scores: z.array(z.object({ criterion: z.string().max(40), score: z.number().int().min(0).max(RUBRIC_MAX), feedback: z.string().max(600) })).min(1).max(8),
  summary: z.string().max(1200),
});
export type GradeOutput = z.infer<typeof gradeSchema>;

export const GRADE_PROMPT_VERSION = "test-grade@1";

/** Playbook readiness domain (section 10 of the playbook) that each roadmap level mainly feeds. */
export const LEVEL_DOMAIN: Record<number, string> = {
  0: "python-sql", 1: "llm", 2: "llm", 3: "llm", 4: "rag", 5: "agents", 6: "agents", 7: "rag", 8: "agents",
  9: "system-design", 10: "production", 11: "production", 12: "llm", 13: "llm", 14: "project", 15: "behavioral",
};

export const MCQ_COUNT = { weekly: 12, cumulative: 15, level: 12 } as const;
export const WRITTEN_COUNT = { weekly: 3, cumulative: 4, level: 3 } as const;
export const ANSWER_MAX_CHARS = 6000;
