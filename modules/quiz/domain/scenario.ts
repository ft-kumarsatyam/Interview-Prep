/**
 * Scenario and debugging questions ("a service slows down after a deploy, what is the likeliest cause?"). The
 * prompts, the output shape and the agreement check for the second-pass verification. Pure; the script that calls
 * the model is scripts/generate-scenarios.ts. Model-written answer keys are never trusted on their own: a question is
 * kept only when an independent second answer, given without seeing the key, agrees.
 */
import { z } from "zod";
import { DIFFICULTIES, quizQuestionSchema, type QuizQuestion } from "@/modules/quiz/lib/question";

export const SCENARIO_STYLES = ["scenario", "debug"] as const;
const text = (max: number) => z.string().trim().min(1).max(max);

export const scenarioItemSchema = z.object({
  style: z.enum(SCENARIO_STYLES),
  prompt: z.string().trim().min(20).max(500),
  options: z.array(text(300)).length(4).refine((o) => new Set(o).size === 4, "options must be distinct"),
  answerIndex: z.number().int().min(0).max(3),
  explanation: text(600),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.array(text(30)).min(1).max(4),
});
export type ScenarioItem = z.infer<typeof scenarioItemSchema>;
export const scenarioSetSchema = (min: number, max: number) => z.object({ questions: z.array(scenarioItemSchema).min(min).max(max) });

export const verifyAnswerSchema = z.object({ answerIndex: z.number().int().min(0).max(3) });

export function scenarioPrompt(input: { subtopic: string; topic: string; track: string; count: number; avoid: readonly string[] }): string {
  return [
    "You write multiple-choice questions for a senior backend interview-prep app.",
    `Track: ${input.track}. Topic: ${input.topic}. Subtopic: "${input.subtopic}".`,
    `Write ${input.count} questions, mixing the two styles:`,
    '- "scenario": a short real-world situation (a production incident, a design choice, a trade-off under constraints) and a question about what to do or why.',
    '- "debug": a described bug or symptom (logs, behaviour, metrics, an error) and a question about the most likely cause or the fix. Describe it in words; do not include code blocks.',
    "Rules: exactly 4 distinct options (≤ 150 chars each), exactly one clearly correct, the wrong ones plausible but wrong for a stated reason, answerIndex 0-3, a 1-2 sentence explanation of why the answer is right, prompt 20-400 chars, plain text only.",
    'difficulty is easy, medium or hard. tags are 1-4 short lowercase labels such as "production", "tradeoff", "latency", "consistency".',
    ...(input.avoid.length ? ["Do not repeat or closely paraphrase these existing questions:", ...input.avoid.slice(0, 12).map((p) => `- ${p.slice(0, 120)}`)] : []),
    'Return ONLY JSON: {"questions":[{"style":"scenario","prompt":"…","options":["…","…","…","…"],"answerIndex":0,"explanation":"…","difficulty":"medium","tags":["…"]}]}',
  ].join("\n");
}

/** The second pass: the question without its key, answered independently. */
export function verifyPrompt(item: Pick<ScenarioItem, "prompt" | "options">): string {
  return [
    "Answer this multiple-choice question as an expert backend engineer. Think carefully; exactly one option is best.",
    `Question: ${item.prompt}`,
    ...item.options.map((o, i) => `${i}. ${o}`),
    'Return ONLY JSON: {"answerIndex": <0-3>}',
  ].join("\n");
}

export const agrees = (item: Pick<ScenarioItem, "answerIndex">, answer: z.infer<typeof verifyAnswerSchema>) => item.answerIndex === answer.answerIndex;

/** A verified item as a stored bank question (validates every cap). */
export function toStoredScenario(item: ScenarioItem, id: string, ref: string): QuizQuestion {
  return quizQuestionSchema.parse({
    id,
    prompt: item.prompt,
    options: item.options,
    answerIndex: item.answerIndex,
    explanation: item.explanation,
    source: { kind: "subtopic", ref },
    style: item.style,
    difficulty: item.difficulty,
    tags: item.tags.map((t) => t.toLowerCase()),
  });
}
