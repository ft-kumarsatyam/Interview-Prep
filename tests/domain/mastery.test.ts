import { describe, expect, it } from "vitest";
import { canTakeTopicQuiz, nextMasteryScore, passesTopicQuiz, pickTopicQuestions, subtopicWeight } from "@/lib/domain/mastery";
import { seededRng, shuffle, weightedSample } from "@/lib/domain/sampling";

describe("sampling", () => {
  it("shuffles deterministically for a seed and keeps every item", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], seededRng(42));
    const b = shuffle([1, 2, 3, 4, 5, 6], seededRng(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("samples distinct items, never picks zero weight, and favours heavy items", () => {
    const items = ["heavy", "light", "never"];
    const weight = (x: string) => (x === "heavy" ? 9 : x === "light" ? 1 : 0);
    expect(weightedSample(items, weight, 5, seededRng(1)).sort()).toEqual(["heavy", "light"]);
    const rng = seededRng(7);
    let heavyFirst = 0;
    for (let i = 0; i < 500; i++) if (weightedSample(items, weight, 1, rng)[0] === "heavy") heavyFirst++;
    expect(heavyFirst).toBeGreaterThan(400);
  });
});

describe("mastery", () => {
  it("sets the score on the first attempt, then moves as an EMA", () => {
    expect(nextMasteryScore(null, 80)).toBe(80);
    expect(nextMasteryScore({ score: 50, attempts: 1 }, 100)).toBe(70);
    expect(nextMasteryScore({ score: 90, attempts: 4 }, 0)).toBe(54);
    expect(nextMasteryScore(null, 140)).toBe(100);
  });

  it("opens the topic quiz only when every subtopic is ticked", () => {
    expect(canTakeTopicQuiz(["t:0", "t:1"], new Set(["t:0", "t:1", "x:0"]))).toBe(true);
    expect(canTakeTopicQuiz(["t:0", "t:1"], new Set(["t:0"]))).toBe(false);
    expect(canTakeTopicQuiz([], new Set())).toBe(false);
  });

  it("passes at or above the threshold", () => {
    expect(passesTopicQuiz(70, 70)).toBe(true);
    expect(passesTopicQuiz(69, 70)).toBe(false);
  });

  it("weights weak subtopics up to 5× mastered ones", () => {
    expect(subtopicWeight(undefined)).toBe(5);
    expect(subtopicWeight(100)).toBe(1);
    expect(subtopicWeight(50)).toBe(3);
  });

  it("draws topic questions mostly from the weakest subtopic, without duplicates", () => {
    const q = (ref: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${ref}-${i}`, ref }));
    const by = new Map([
      ["weak", q("weak", 20)],
      ["strong", q("strong", 20)],
    ]);
    const picked = pickTopicQuestions(by, { weak: 0, strong: 100 }, 10, seededRng(3));
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((p) => p.id)).size).toBe(10);
    expect(picked.filter((p) => p.ref === "weak").length).toBeGreaterThan(5);
  });

  it("stops when every subtopic runs out", () => {
    const by = new Map([["a", [{ id: "a1" }, { id: "a2" }]]]);
    expect(pickTopicQuestions(by, {}, 10, seededRng(1))).toHaveLength(2);
  });
});
