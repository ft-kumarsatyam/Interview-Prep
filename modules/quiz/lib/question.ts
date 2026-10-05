import { z } from "zod";

export const QUESTION_STYLES = ["output", "concept", "pattern", "recall", "llm", "scenario", "debug"] as const;
export type QuestionStyle = (typeof QUESTION_STYLES)[number];

export const SOURCE_KINDS = ["problem", "subtopic", "pattern", "article", "case"] as const;

/** `single` is the default for every question that predates the other formats. */
export const QUESTION_TYPES = ["single", "multi", "truefalse"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const MAX_OPTIONS = 6;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const difficultySchema = z.enum(DIFFICULTIES);

const optionText = z.string().trim().min(1).max(300);
const distinct = (o: string[]) => new Set(o).size === o.length;

/** Exactly 4 options: the LLM format and the original bank format. */
const options = z.array(optionText).length(4).refine(distinct, "options must be distinct");
/** 2-6 options for the stored shape, so multi-select and true/false fit. */
const storedOptions = z.array(optionText).min(2).max(MAX_OPTIONS).refine(distinct, "options must be distinct");

/** One stored MCQ (bank, daily/weekly quiz). Length caps double as the LLM output guard. */
export const quizQuestionSchema = z
  .object({
    id: z.string().min(1).max(80),
    prompt: z.string().trim().min(5).max(500),
    code: z.string().max(1500).optional(),
    options: storedOptions,
    /** For `multi` this is the lowest correct index, so code that only knows single answers still sees a valid index. */
    answerIndex: z.number().int().min(0).max(MAX_OPTIONS - 1),
    type: z.enum(QUESTION_TYPES).optional(),
    /** `multi` only: every correct option, ascending and unique. */
    answerIndices: z.array(z.number().int().min(0).max(MAX_OPTIONS - 1)).min(2).optional(),
    explanation: z.string().trim().max(600),
    source: z.object({ kind: z.enum(SOURCE_KINDS), ref: z.string().max(200) }),
    style: z.enum(QUESTION_STYLES),
    /** Unrated questions (generated, LLM) count as any difficulty. */
    difficulty: difficultySchema.optional(),
    /** Short labels such as "production" or "tradeoff", for filtering. */
    tags: z.array(z.string().trim().min(1).max(30)).max(6).optional(),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const type = q.type ?? "single";
    if (q.answerIndex >= q.options.length) issue("answerIndex is outside the options");
    if (type === "multi") {
      const idx = q.answerIndices;
      if (!idx) return issue("multi questions need answerIndices");
      if (new Set(idx).size !== idx.length || idx.some((i, n) => n > 0 && i <= idx[n - 1]!)) issue("answerIndices must be ascending and unique");
      if (idx.some((i) => i >= q.options.length)) issue("answerIndices are outside the options");
      if (idx.length >= q.options.length) issue("a multi question can't have every option correct");
      if (q.answerIndex !== idx[0]) issue("answerIndex must equal the first answerIndices entry");
    } else {
      if (q.answerIndices) issue("answerIndices is only for multi questions");
      if (type === "truefalse" && q.options.length !== 2) issue("true/false questions have exactly 2 options");
    }
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
  /** Omitted for `single`. Not secret: the player needs it to render checkboxes vs radios. */
  type?: QuestionType;
}

export interface ReviewItem {
  id: string;
  answerIndex: number;
  /** `multi` only. */
  answerIndices?: number[];
  type?: QuestionType;
  /** Which Gemini project fits this question (see lib/domain/ask-subjects.ts). */
  subject?: string;
  explanation: string;
  /** Where to read more about the idea behind this question. */
  learnMore?: { href: string; label: string; reading?: { title: string; url: string } };
}

export interface QuizOutcome {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  review: ReviewItem[];
}

export function toPublic(q: Pick<QuizQuestion, "id" | "prompt" | "code" | "options"> & { type?: QuestionType }): PublicQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    ...(q.code ? { code: q.code } : {}),
    options: [...q.options],
    ...(q.type && q.type !== "single" ? { type: q.type } : {}),
  };
}

export function toReview(q: Pick<QuizQuestion, "id" | "answerIndex" | "explanation"> & { type?: QuestionType; answerIndices?: number[]; subject?: string; learnMore?: ReviewItem["learnMore"] }): ReviewItem {
  return {
    id: q.id,
    answerIndex: q.answerIndex,
    ...(q.subject ? { subject: q.subject } : {}),
    ...(q.learnMore ? { learnMore: q.learnMore } : {}),
    ...(q.type && q.type !== "single" ? { type: q.type } : {}),
    ...(q.answerIndices ? { answerIndices: [...q.answerIndices] } : {}),
    explanation: q.explanation ?? "",
  };
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

/**
 * A difficulty for questions the bank leaves unrated, from how they are built: recalling a name is easy, spotting a
 * pattern or a short output is medium, and reading longer code is hard. Rated questions keep their rating.
 */
export function defaultDifficulty(q: Pick<QuizQuestion, "style" | "code" | "difficulty">): Difficulty {
  if (q.difficulty) return q.difficulty;
  if (q.style === "recall") return "easy";
  if (q.style === "output") return (q.code?.length ?? 0) > 400 ? "hard" : "medium";
  if (q.style === "pattern") return "medium";
  return "medium";
}

/** What a custom quiz can focus on. "any" keeps every question type. */
export const QUESTION_FOCUS = ["any", "concept", "scenario", "debug", "output"] as const;
export type QuestionFocus = (typeof QUESTION_FOCUS)[number];
