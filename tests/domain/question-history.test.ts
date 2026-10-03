import { describe, expect, it } from "vitest";
import { aptitudeBank } from "@/lib/content";
import { bankDifficultyCounts, bankKey, buildTopicQuestions, maxQuestions, questionIdentity } from "@/lib/domain/aptitude";
import { pickCaseQuestions } from "@/lib/domain/case-quiz";
import { pickTopicQuestions } from "@/lib/domain/mastery";
import { buildHistory, mistakeWeight, outstandingMistakes, rotationWeight, ROTATION_RECOVERY_DAYS, seenSets } from "@/lib/domain/question-history";
import { difficultyLayers, parseDifficulty } from "@/lib/domain/quiz";
import { seededRng } from "@/lib/domain/sampling";

const DAY = 86_400_000;

describe("buildHistory", () => {
  it("folds events per question with the newest answer deciding lastCorrect, regardless of input order", () => {
    const h = buildHistory([
      { id: "a", correct: true, at: 3 },
      { id: "a", correct: false, at: 1 },
      { id: "b", correct: false, at: 2 },
      { id: "a", correct: false, at: 2 },
    ]);
    expect(h.get("a")).toEqual({ attempts: 3, wrong: 2, lastCorrect: true, lastAt: 3 });
    expect(h.get("b")).toEqual({ attempts: 1, wrong: 1, lastCorrect: false, lastAt: 2 });
  });
});

describe("rotationWeight", () => {
  const now = 100 * DAY;
  it("prefers unseen, then missed, then known questions", () => {
    const unseen = rotationWeight(undefined, now);
    const missed = rotationWeight({ attempts: 1, wrong: 1, lastCorrect: false, lastAt: now }, now);
    const known = rotationWeight({ attempts: 1, wrong: 0, lastCorrect: true, lastAt: now }, now);
    expect(unseen).toBeGreaterThan(missed);
    expect(missed).toBeGreaterThan(known);
    expect(known).toBeGreaterThan(0);
  });

  it("brings a known question back to full weight after the recovery window", () => {
    const stat = { attempts: 1, wrong: 0, lastCorrect: true, lastAt: now - ROTATION_RECOVERY_DAYS * DAY };
    expect(rotationWeight(stat, now)).toBe(1);
    expect(rotationWeight({ ...stat, lastAt: now - 3 * DAY }, now)).toBeLessThan(1);
  });
});

describe("mistakes", () => {
  it("lists only questions whose latest answer was wrong, most-missed first", () => {
    const h = buildHistory([
      { id: "fixed", correct: false, at: 1 },
      { id: "fixed", correct: true, at: 2 },
      { id: "once", correct: false, at: 5 },
      { id: "twice", correct: false, at: 1 },
      { id: "twice", correct: false, at: 3 },
    ]);
    expect(outstandingMistakes(h).map((m) => m.id)).toEqual(["twice", "once"]);
    expect(mistakeWeight(h.get("twice")!)).toBeGreaterThan(mistakeWeight(h.get("once")!));
    expect(seenSets(h)).toEqual({ seen: new Set(["fixed", "once", "twice"]), wrong: new Set(["once", "twice"]) });
  });
});

describe("difficulty helpers", () => {
  it("parses only known difficulties", () => {
    expect(parseDifficulty("hard")).toBe("hard");
    expect(parseDifficulty("HARD")).toBeNull();
    expect(parseDifficulty(undefined)).toBeNull();
  });

  it("puts matching questions first and keeps the originals as fallback", () => {
    const layers = [[{ id: "e", difficulty: "easy" as const }, { id: "h", difficulty: "hard" as const }, { id: "u" }]];
    expect(difficultyLayers(layers, null)).toEqual(layers);
    const out = difficultyLayers(layers, "hard");
    expect(out[0]!.map((q) => q.id)).toEqual(["h"]);
    expect(out[1]).toEqual(layers[0]);
  });
});

describe("weighted pickers", () => {
  it("pickTopicQuestions favours heavier questions within a subtopic", () => {
    const qs = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}` }));
    let heavyHits = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const [q] = pickTopicQuestions(new Map([["s", qs]]), {}, 1, seededRng(seed), (x) => (x.id === "q7" ? 50 : 1));
      if (q!.id === "q7") heavyHits++;
    }
    expect(heavyHits).toBeGreaterThan(100);
  });

  it("pickCaseQuestions with a weight still returns distinct questions", () => {
    const qs = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}` }));
    const picked = pickCaseQuestions(qs, 8, seededRng(3), (q) => (q.id < "c5" ? 0.2 : 4));
    expect(new Set(picked.map((q) => q.id)).size).toBe(8);
  });
});

describe("aptitude bank rotation and difficulty", () => {
  const topic = "sentence-correction";

  it("keeps questions that share a generic prompt but differ in options", () => {
    const entries = aptitudeBank[topic]!;
    const generic = entries.filter((e) => e.p === "Choose the correct sentence.");
    expect(generic.length).toBeGreaterThan(1);
    const all = buildTopicQuestions(topic, entries.length, 11, aptitudeBank);
    expect(all).toHaveLength(entries.length);
    expect(new Set(all.map(questionIdentity)).size).toBe(entries.length);
  });

  it("gives every bank question a stable key", () => {
    const keys = aptitudeBank[topic]!.map((e) => bankKey(topic, e));
    expect(new Set(keys).size).toBe(keys.length);
    expect(buildTopicQuestions(topic, 5, 1, aptitudeBank).every((q) => q.key && keys.includes(q.key))).toBe(true);
  });

  it("serves unseen questions before seen ones", () => {
    const first = buildTopicQuestions(topic, 10, 5, aptitudeBank);
    const seen = new Set(first.map((q) => q.key!));
    const next = buildTopicQuestions(topic, 10, 5, aptitudeBank, { seen, wrong: new Set() });
    expect(next.some((q) => seen.has(q.key!))).toBe(false);
  });

  it("filters by difficulty and caps the drill at that difficulty's size", () => {
    const counts = bankDifficultyCounts(topic, aptitudeBank);
    expect(counts.easy + counts.medium + counts.hard).toBe(aptitudeBank[topic]!.length);
    const hard = buildTopicQuestions(topic, 50, 2, aptitudeBank, { difficulty: "hard" });
    expect(hard).toHaveLength(counts.hard);
    expect(hard.every((q) => q.difficulty === "hard")).toBe(true);
    expect(maxQuestions(topic, aptitudeBank, "hard")).toBe(counts.hard);
  });
});
