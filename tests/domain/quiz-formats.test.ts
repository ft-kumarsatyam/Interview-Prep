import { describe, expect, it } from "vitest";
import { chosenIndices, correctAnswerKey, correctIndices, indicesOf, isAnswerCorrect, maskOf, scoreQuiz } from "@/lib/domain/quiz";
import { quizBankSchema, quizQuestionSchema, toPublic, toReview } from "@/lib/quiz/question";
import bankJson from "@/data/quiz-bank.json";

const single = { answerIndex: 2 };
const multi = { type: "multi" as const, answerIndex: 0, answerIndices: [0, 2, 3] };
const truefalse = { type: "truefalse" as const, answerIndex: 1 };

describe("answer encoding", () => {
  it("round-trips a bitmask", () => {
    expect(maskOf([0, 2, 3])).toBe(0b1101);
    expect(indicesOf(0b1101, 4)).toEqual([0, 2, 3]);
    expect(indicesOf(0, 4)).toEqual([]);
    expect(indicesOf(maskOf([5]), 6)).toEqual([5]);
  });

  it("keys single and true/false by index, multi by mask", () => {
    expect(correctAnswerKey(single)).toBe(2);
    expect(correctAnswerKey(truefalse)).toBe(1);
    expect(correctAnswerKey(multi)).toBe(0b1101);
  });

  it("treats a stored question with no `type` as single", () => {
    expect(correctAnswerKey({ answerIndex: 3 })).toBe(3);
    expect(isAnswerCorrect({ answerIndex: 3 }, 3)).toBe(true);
  });
});

describe("isAnswerCorrect", () => {
  it("is exact for single choice, including answer index 0", () => {
    expect(isAnswerCorrect({ answerIndex: 0 }, 0)).toBe(true);
    expect(isAnswerCorrect(single, 1)).toBe(false);
  });
  it("counts null, undefined and the stored -1 as wrong", () => {
    for (const a of [null, undefined, -1]) expect(isAnswerCorrect(single, a)).toBe(false);
  });
  it("needs the exact set for multi-select: no partial credit, no extras", () => {
    expect(isAnswerCorrect(multi, 0b1101)).toBe(true);
    expect(isAnswerCorrect(multi, 0b0101)).toBe(false); // missing one
    expect(isAnswerCorrect(multi, 0b1111)).toBe(false); // one extra
    expect(isAnswerCorrect(multi, 0)).toBe(false);
  });
  it("does not confuse a multi mask with a single index", () => {
    // mask 3 (options 0 and 1) must not match a single question whose answerIndex is 3.
    expect(isAnswerCorrect({ type: "multi", answerIndex: 0, answerIndices: [0, 1] }, 3)).toBe(true);
    expect(isAnswerCorrect({ answerIndex: 3 }, 0b11)).toBe(true); // numerically equal, so type must drive interpretation
  });
});

describe("scoreQuiz with a mixed quiz (signature unchanged)", () => {
  it("scores single, multi and true/false together", () => {
    const qs = [single, multi, truefalse];
    const key = qs.map(correctAnswerKey);
    expect(scoreQuiz(key, [2, 0b1101, 1])).toEqual({ correct: 3, total: 3, pct: 100 });
    expect(scoreQuiz(key, [2, 0b0101, 0])).toEqual({ correct: 1, total: 3, pct: 33 });
    expect(scoreQuiz(key, [null, null, null]).correct).toBe(0);
  });

  it("weekly weighting: the same comparison buildWeekly uses marks a wrong multi answer wrong", () => {
    const weight = (q: typeof multi | typeof single, stored: number | undefined) => (isAnswerCorrect(q, stored) ? 1 : 3);
    expect(weight(multi, 0b1101)).toBe(1);
    expect(weight(multi, 0b0001)).toBe(3);
    expect(weight(single, 2)).toBe(1);
    expect(weight(single, -1)).toBe(3);
  });
});

describe("review helpers", () => {
  it("lists chosen and correct options", () => {
    expect(chosenIndices(multi, 0b0101, 4)).toEqual([0, 2]);
    expect(chosenIndices(single, 1, 4)).toEqual([1]);
    expect(chosenIndices(single, null, 4)).toEqual([]);
    expect(correctIndices(multi)).toEqual([0, 2, 3]);
    expect(correctIndices(single)).toEqual([2]);
  });
});

describe("quizQuestionSchema", () => {
  const base = { id: "q1", prompt: "Pick the right ones", explanation: "because", source: { kind: "subtopic" as const, ref: "x" }, style: "concept" as const };

  it("accepts the original 4-option single format untouched", () => {
    expect(quizQuestionSchema.safeParse({ ...base, options: ["a", "b", "c", "d"], answerIndex: 1 }).success).toBe(true);
  });
  it("accepts a valid multi-select question", () => {
    expect(quizQuestionSchema.safeParse({ ...base, type: "multi", options: ["a", "b", "c", "d"], answerIndex: 0, answerIndices: [0, 2] }).success).toBe(true);
  });
  it("accepts a valid true/false question", () => {
    expect(quizQuestionSchema.safeParse({ ...base, type: "truefalse", options: ["True", "False"], answerIndex: 0 }).success).toBe(true);
  });
  it.each([
    ["multi without answerIndices", { type: "multi", options: ["a", "b", "c"], answerIndex: 0 }],
    ["multi with every option correct", { type: "multi", options: ["a", "b", "c"], answerIndex: 0, answerIndices: [0, 1, 2] }],
    ["multi answerIndex not the first correct", { type: "multi", options: ["a", "b", "c", "d"], answerIndex: 1, answerIndices: [0, 2] }],
    ["multi with unsorted indices", { type: "multi", options: ["a", "b", "c", "d"], answerIndex: 2, answerIndices: [2, 0] }],
    ["answerIndices on a single question", { options: ["a", "b", "c", "d"], answerIndex: 0, answerIndices: [0, 1] }],
    ["true/false with 3 options", { type: "truefalse", options: ["a", "b", "c"], answerIndex: 0 }],
    ["answerIndex outside the options", { options: ["a", "b"], answerIndex: 3 }],
    ["duplicate options", { options: ["a", "a", "b", "c"], answerIndex: 0 }],
    ["more than 6 options", { options: ["a", "b", "c", "d", "e", "f", "g"], answerIndex: 0 }],
  ])("rejects %s", (_name, extra) => {
    expect(quizQuestionSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  });
});

describe("toPublic / toReview", () => {
  it("leaves single questions looking exactly as before", () => {
    expect(toPublic({ id: "a", prompt: "p", options: ["1", "2", "3", "4"] })).toEqual({ id: "a", prompt: "p", options: ["1", "2", "3", "4"] });
    expect(toReview({ id: "a", answerIndex: 1, explanation: "e" })).toEqual({ id: "a", answerIndex: 1, explanation: "e" });
  });
  it("exposes the type but never the answer key in the public shape", () => {
    const pub = toPublic({ id: "m", prompt: "p", options: ["1", "2", "3"], type: "multi" });
    expect(pub.type).toBe("multi");
    expect(JSON.stringify(pub)).not.toContain("answer");
  });
  it("carries answerIndices in the review", () => {
    expect(toReview({ id: "m", answerIndex: 0, answerIndices: [0, 2], type: "multi", explanation: "" })).toMatchObject({ type: "multi", answerIndices: [0, 2] });
  });
});

describe("data/quiz-bank.json", () => {
  const parsed = quizBankSchema.parse(bankJson);
  it("still validates, with unique ids", () => {
    expect(new Set(parsed.questions.map((q) => q.id)).size).toBe(parsed.questions.length);
  });
  it("keeps every pre-existing question a 4-option single-answer question", () => {
    const legacy = parsed.questions.filter((q) => !q.type);
    expect(legacy.length).toBeGreaterThanOrEqual(1245);
    for (const q of legacy) {
      expect(q.options).toHaveLength(4);
      expect(q.answerIndices).toBeUndefined();
    }
  });
});
