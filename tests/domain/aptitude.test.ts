import { describe, expect, it } from "vitest";
import aptitudeBankJson from "@/data/aptitude-bank.json";
import { buildMockQuestions, buildTopicQuestions, hasConventionalOrder, hasQuestions, maxQuestions, questionIdentity, type AptitudeBank } from "@/lib/domain/aptitude";
import { syllogismFollows } from "@/lib/domain/aptitude/logical";
import { MASTERY_WINDOW, topicStats, type SessionRecord } from "@/lib/domain/aptitude/progress";
import { frac } from "@/lib/domain/aptitude/question";
import { APTITUDE_CATEGORIES, APTITUDE_TOPICS, topicsIn } from "@/lib/domain/aptitude/topics";

const bank = aptitudeBankJson as unknown as AptitudeBank;

describe("aptitude catalog", () => {
  it("has unique topic ids and a question source for every topic", () => {
    const ids = APTITUDE_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of APTITUDE_TOPICS) expect(hasQuestions(t.id, bank), t.id).toBe(true);
  });

  it("covers the three categories with the expected topic counts", () => {
    expect(topicsIn("quantitative")).toHaveLength(25);
    expect(topicsIn("logical")).toHaveLength(14);
    expect(topicsIn("verbal")).toHaveLength(8);
    expect(APTITUDE_CATEGORIES).toHaveLength(3);
  });

  it("has a bank only for known topics", () => {
    const known = new Set(APTITUDE_TOPICS.map((t) => t.id));
    for (const id of Object.keys(bank)) expect(known.has(id), id).toBe(true);
  });
});

describe("generated and banked questions", () => {
  it("are well-formed for every topic across many seeds", () => {
    for (const topic of APTITUDE_TOPICS) {
      for (let seed = 1; seed <= 60; seed++) {
        const qs = buildTopicQuestions(topic.id, 10, seed * 7919, bank);
        expect(qs.length, topic.id).toBeGreaterThan(0);
        for (const q of qs) {
          const where = `${topic.id} seed ${seed}: ${q.prompt}`;
          expect(q.options.length, where).toBe(4);
          expect(new Set(q.options).size, where).toBe(4);
          expect(q.answerIndex, where).toBeGreaterThanOrEqual(0);
          expect(q.answerIndex, where).toBeLessThan(4);
          expect(q.explanation.length, where).toBeGreaterThan(5);
          for (const text of [q.prompt, q.explanation, ...q.options]) expect(text, where).not.toMatch(/NaN|undefined|Infinity|\[object/);
        }
        expect(new Set(qs.map(questionIdentity)).size, topic.id).toBe(qs.length);
      }
    }
  });

  it("are deterministic for a seed and differ between seeds", () => {
    const a = buildTopicQuestions("percentage", 10, 42, bank);
    const b = buildTopicQuestions("percentage", 10, 42, bank);
    const c = buildTopicQuestions("percentage", 10, 43, bank);
    expect(a).toEqual(b);
    expect(a.map((q) => q.prompt)).not.toEqual(c.map((q) => q.prompt));
  });

  it("caps bank-only topics at the bank size", () => {
    expect(maxQuestions("idioms-phrases", bank)).toBe(bank["idioms-phrases"].length);
    expect(buildTopicQuestions("idioms-phrases", 99, 1, bank)).toHaveLength(bank["idioms-phrases"].length);
    expect(maxQuestions("percentage", bank)).toBe(Infinity);
  });

  it("keeps the answer text when options are shuffled", () => {
    for (const q of buildTopicQuestions("synonyms-antonyms", 14, 9, bank)) {
      const entry = bank["synonyms-antonyms"].find((e) => e.p === q.prompt);
      expect(q.options[q.answerIndex]).toBe(entry?.c);
    }
  });

  it("keeps the conventional order for 'Only I…' style options", () => {
    const qs = buildTopicQuestions("data-sufficiency", 9, 3, bank);
    for (const q of qs) {
      expect(hasConventionalOrder(q.options)).toBe(true);
      expect(q.options[0]).toMatch(/^(Statement )?I alone is sufficient$/);
    }
  });

  it("puts answer-plus-distractor entries with standard options in standard order, not answer-first", () => {
    const qs = buildTopicQuestions("spotting-errors", bank["spotting-errors"].length, 4, bank);
    for (const q of qs.filter((x) => x.options.every((o) => /^[A-D]$/.test(o)))) expect(q.options).toEqual(["A", "B", "C", "D"]);
    expect(new Set(qs.map((q) => q.answerIndex)).size).toBeGreaterThan(1);
  });

  it("builds a mixed mock across a category", () => {
    const mock = buildMockQuestions("quantitative", 20, 5, bank);
    expect(mock).toHaveLength(20);
    expect(new Set(mock.map((q) => q.topic)).size).toBeGreaterThan(10);
    expect(new Set(mock.map((q) => q.id)).size).toBe(20);
  });
});

describe("known answers", () => {
  it("reduces fractions", () => {
    expect(frac(6, 36)).toBe("1/6");
    expect(frac(4, 2)).toBe("2");
  });

  it("checks syllogisms by model", () => {
    // All A are B, All B are C ⊢ All A are C
    expect(syllogismFollows([["all", 0, 1], ["all", 1, 2]], ["all", 0, 2])).toBe(true);
    // Some A are B, All B are C ⊢ Some A are C
    expect(syllogismFollows([["some", 0, 1], ["all", 1, 2]], ["some", 0, 2])).toBe(true);
    // All A are B, All C are B ⊬ All A are C
    expect(syllogismFollows([["all", 0, 1], ["all", 2, 1]], ["all", 0, 2])).toBe(false);
    // Some A are B, Some B are C ⊬ Some A are C
    expect(syllogismFollows([["some", 0, 1], ["some", 1, 2]], ["some", 0, 2])).toBe(false);
    // All A are B, No B is C ⊢ No A is C
    expect(syllogismFollows([["all", 0, 1], ["no", 1, 2]], ["no", 0, 2])).toBe(true);
  });

  it("answers a speed question correctly", () => {
    const q = buildTopicQuestions("speed-time-distance", 40, 11, bank).find((x) => x.prompt.startsWith("Convert"));
    expect(q).toBeDefined();
    const speed = Number(/Convert (\d+) km\/h/.exec(q?.prompt ?? "")?.[1]);
    expect(Number(q?.options[q.answerIndex])).toBeCloseTo((speed * 5) / 18);
  });
});

describe("topicStats", () => {
  const s = (total: number, correct: number, secEach = 30, at = "2026-10-01T00:00:00Z"): SessionRecord => ({ topicId: "percentage", total, correct, totalMs: total * secEach * 1000, at });

  it("is new with no sessions", () => {
    expect(topicStats("percentage", []).status).toBe("new");
  });

  it("practising until a full window passes the accuracy bar", () => {
    expect(topicStats("percentage", [s(10, 10)]).status).toBe("practising");
    expect(topicStats("percentage", [s(10, 9), s(10, 8)]).status).toBe("mastered");
    expect(topicStats("percentage", [s(10, 5), s(10, 5)]).status).toBe("practising");
  });

  it("only looks at the most recent window", () => {
    const stats = topicStats("percentage", [s(10, 10), s(10, 9), s(10, 0)]);
    expect(stats.attempted).toBe(MASTERY_WINDOW);
    expect(stats.status).toBe("mastered");
  });

  it("rates speed against the topic target", () => {
    expect(topicStats("percentage", [s(10, 10, 20)]).speed).toBe("fast");
    expect(topicStats("percentage", [s(10, 10, 45)]).speed).toBe("ok");
    expect(topicStats("percentage", [s(10, 10, 90)]).speed).toBe("slow");
  });
});

describe("summarizeRun", () => {
  it("counts correct, skipped and within-target answers and ranks weak topics first", async () => {
    const { summarizeRun } = await import("@/lib/domain/aptitude/progress");
    const s = summarizeRun([
      { topic: "percentage", choice: 1, answerIndex: 1, ms: 20_000 },
      { topic: "percentage", choice: 2, answerIndex: 1, ms: 30_000 },
      { topic: "algebra", choice: null, answerIndex: 0, ms: 60_000 },
      { topic: "algebra", choice: 0, answerIndex: 0, ms: 100_000 },
    ]);
    expect(s).toMatchObject({ total: 4, answered: 3, correct: 2, accuracy: 0.5, withinTarget: 1 });
    expect(s.avgSec).toBeCloseTo(52.5);
    expect(s.perTopic.map((t) => t.topic)).toEqual(["algebra", "percentage"]);
  });
});
