import { z } from "zod";

export const QUESTION_STYLES = ["output", "concept", "pattern", "recall", "llm"] as const;
export type QuestionStyle = (typeof QUESTION_STYLES)[number];

export const SOURCE_KINDS = ["problem", "subtopic", "pattern", "article"] as const;

const options = z
  .array(z.string().trim().min(1).max(300))
  .length(4)
  .refine((o) => new Set(o).size === 4, "options must be distinct");

/** One stored MCQ (bank, daily/weekly quiz). Length caps double as the LLM output guard. */
export const quizQuestionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().trim().min(5).max(500),
  code: z.string().max(1500).optional(),
  options,
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(600),
  source: z.object({ kind: z.enum(SOURCE_KINDS), ref: z.string().max(200) }),
  style: z.enum(QUESTION_STYLES),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizBankSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  questions: z.array(quizQuestionSchema),
});
export type QuizBank = z.infer<typeof quizBankSchema>;

/** What the browser sees before submitting: no answer key, no explanation. */
export interface PublicQuestion {
  id: string;
  prompt: string;
  code?: string;
  options: string[];
}

export interface ReviewItem {
  id: string;
  answerIndex: number;
  explanation: string;
}

export interface QuizOutcome {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  review: ReviewItem[];
}

export function toPublic(q: Pick<QuizQuestion, "id" | "prompt" | "code" | "options">): PublicQuestion {
  return { id: q.id, prompt: q.prompt, ...(q.code ? { code: q.code } : {}), options: [...q.options] };
}

export function toReview(q: Pick<QuizQuestion, "id" | "answerIndex" | "explanation">): ReviewItem {
  return { id: q.id, answerIndex: q.answerIndex, explanation: q.explanation ?? "" };
}

/** Shape the LLM must return. No code: model-written code is never executed or trusted as an answer key. */
export const llmQuestionSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
  options,
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(600),
  kind: z.enum(["problem", "subtopic", "article"]),
  ref: z.string().max(200),
});
export type LlmQuestion = z.infer<typeof llmQuestionSchema>;

export const llmQuizSchema = (min: number, max: number) =>
  z.object({ questions: z.array(llmQuestionSchema).min(min).max(max) });
