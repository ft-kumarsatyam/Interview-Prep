import { DIFFICULTIES, type Difficulty, type QuestionType } from "@/modules/quiz/lib/question";

/**
 * A stored answer is one number per question: the chosen option index for
 * `single`/`truefalse` (exactly as before multi-select existed), or a bitmask
 * over the ORIGINAL option indices for `multi` (bit i set = option i chosen).
 * The answer key uses the same encoding, so `scoreQuiz` stays a plain
 * number-to-number comparison. Always compare through `correctAnswerKey`:
 * reading `answerIndex` directly is wrong for multi-select questions.
 */
export interface AnswerKeyed {
  type?: QuestionType | null;
  answerIndex: number;
  answerIndices?: readonly number[] | null;
}

export function maskOf(indices: readonly number[]): number {
  return indices.reduce((mask, i) => mask | (1 << i), 0);
}

export function indicesOf(mask: number, optionCount: number): number[] {
  return Array.from({ length: optionCount }, (_, i) => i).filter((i) => (mask & (1 << i)) !== 0);
}

/** `type` is read defensively: stored questions that predate multi-select have none. */
export function correctAnswerKey(q: AnswerKeyed): number {
  return (q.type ?? "single") === "multi" ? maskOf(q.answerIndices ?? []) : q.answerIndex;
}

export function isAnswerCorrect(q: AnswerKeyed, answer: number | null | undefined): boolean {
  return answer !== null && answer !== undefined && answer >= 0 && answer === correctAnswerKey(q);
}

/** Option indices the learner picked, for showing "Your answer" in a review. */
export function chosenIndices(q: AnswerKeyed, answer: number | null | undefined, optionCount: number): number[] {
  if (answer === null || answer === undefined || answer < 0) return [];
  return (q.type ?? "single") === "multi" ? indicesOf(answer, optionCount) : [answer];
}

/** Option indices that are correct, for showing "Correct" in a review. */
export function correctIndices(q: AnswerKeyed): number[] {
  return (q.type ?? "single") === "multi" ? [...(q.answerIndices ?? [])] : [q.answerIndex];
}

export interface QuizScore {
  correct: number;
  total: number;
  pct: number;
}

/** Unanswered questions (null) count as wrong. */
export function scoreQuiz(answerKey: number[], answers: Array<number | null>): QuizScore {
  const total = answerKey.length;
  const correct = answerKey.reduce((n, key, i) => n + (answers[i] === key ? 1 : 0), 0);
  return { correct, total, pct: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

export function isPassing(score: QuizScore, passPct: number): boolean {
  return score.total > 0 && score.pct >= passPct;
}

export function parseDifficulty(raw: unknown): Difficulty | null {
  return typeof raw === "string" && (DIFFICULTIES as readonly string[]).includes(raw) ? (raw as Difficulty) : null;
}

/**
 * With a difficulty chosen, try every layer's matching questions first, then fall back to the
 * original layers, so a thin difficulty never leaves a run short. Unrated questions only fill in.
 */
export function difficultyLayers<T extends { difficulty?: Difficulty }>(layers: readonly T[][], difficulty: Difficulty | null | undefined): T[][] {
  if (!difficulty) return [...layers];
  return [...layers.map((l) => l.filter((q) => q.difficulty === difficulty)), ...layers];
}
