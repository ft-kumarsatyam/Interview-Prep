import { describe, expect, it } from "vitest";
import { agrees, scenarioItemSchema, scenarioPrompt, toStoredScenario, verifyPrompt, type ScenarioItem } from "@/modules/quiz/domain/scenario";
import { defaultDifficulty, quizQuestionSchema } from "@/modules/quiz/lib/question";
import { focusOf } from "@/modules/quiz/services/practice";

const item: ScenarioItem = {
  style: "scenario",
  prompt: "After a deploy, p99 latency doubles while CPU stays flat. What do you check first?",
  options: ["Connection pool exhaustion", "Add more CPU", "Rewrite in Go", "Disable logging"],
  answerIndex: 0,
  explanation: "Flat CPU with higher latency points to waiting, often on a pool or a lock.",
  difficulty: "medium",
  tags: ["Production", "latency"],
};

describe("scenario questions", () => {
  it("accepts a well-formed item and rejects duplicate options or a bad index", () => {
    expect(scenarioItemSchema.safeParse(item).success).toBe(true);
    expect(scenarioItemSchema.safeParse({ ...item, options: ["a", "a", "b", "c"] }).success).toBe(false);
    expect(scenarioItemSchema.safeParse({ ...item, answerIndex: 4 }).success).toBe(false);
  });

  it("stores a verified item as a bank question with lowercase tags", () => {
    const q = toStoredScenario(item, "sc-1", "hld-framework:0");
    expect(quizQuestionSchema.safeParse(q).success).toBe(true);
    expect(q.style).toBe("scenario");
    expect(q.tags).toEqual(["production", "latency"]);
    expect(q.source).toEqual({ kind: "subtopic", ref: "hld-framework:0" });
  });

  it("keeps an item only when the independent answer agrees", () => {
    expect(agrees(item, { answerIndex: 0 })).toBe(true);
    expect(agrees(item, { answerIndex: 2 })).toBe(false);
  });

  it("never leaks the key into the verification prompt", () => {
    const p = verifyPrompt(item);
    expect(p).not.toMatch(/explanation|answerIndex": 0/);
    expect(p).toContain("0. Connection pool exhaustion");
  });

  it("asks for both styles and lists questions to avoid", () => {
    const p = scenarioPrompt({ subtopic: "Caching", topic: "HLD", track: "System Design", count: 3, avoid: ["Existing question text"] });
    expect(p).toContain('"scenario"');
    expect(p).toContain('"debug"');
    expect(p).toContain("Existing question text");
  });
});

describe("question focus and default difficulty", () => {
  const q = (style: "concept" | "scenario" | "debug" | "output" | "recall" | "pattern", id: string) =>
    quizQuestionSchema.parse({ id, prompt: "A question prompt", options: ["a", "b"], answerIndex: 0, explanation: "x", source: { kind: "subtopic", ref: "r" }, style });

  it("filters to a type, but falls back when fewer than two match", () => {
    const qs = [q("concept", "1"), q("scenario", "2"), q("scenario", "3"), q("debug", "4")];
    expect(focusOf(qs, "scenario").map((x) => x.id)).toEqual(["2", "3"]);
    expect(focusOf(qs, "debug")).toHaveLength(4);
    expect(focusOf(qs, "any")).toHaveLength(4);
    expect(focusOf(qs, undefined)).toHaveLength(4);
  });

  it("rates unrated questions by how they are built and keeps real ratings", () => {
    expect(defaultDifficulty({ style: "recall" })).toBe("easy");
    expect(defaultDifficulty({ style: "pattern" })).toBe("medium");
    expect(defaultDifficulty({ style: "output", code: "x".repeat(500) })).toBe("hard");
    expect(defaultDifficulty({ style: "concept", difficulty: "hard" })).toBe("hard");
  });
});
