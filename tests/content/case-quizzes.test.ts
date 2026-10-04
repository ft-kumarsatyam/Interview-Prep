import { describe, expect, it } from "vitest";
import { designCaseBySlug, practiceCaseBySlug, practiceCases, systemDesign } from "@/core/content";
import { CASE_ANCHORS, MIN_QUESTIONS_PER_CASE, caseRef, parseCaseRef } from "@/modules/design/domain/case-quiz";
import { caseBank, learnMoreFor } from "@/modules/quiz/lib/case-bank";
import { correctAnswerKey } from "@/modules/quiz/domain/quiz";

const allRefs = [...systemDesign.cases.map((c) => caseRef("hld", c.slug)), ...practiceCases.map((c) => caseRef(c.kind, c.slug))];

describe("data/case-quizzes.json", () => {
  const bank = caseBank();

  it("covers every System Design, OS and DBMS case and nothing else", () => {
    expect([...bank.keys()].sort()).toEqual([...allRefs].sort());
  });

  it.each(allRefs)("%s has enough varied, well-formed questions", (ref) => {
    const parsed = parseCaseRef(ref)!;
    const qs = bank.get(ref) ?? [];
    expect(qs.length).toBeGreaterThanOrEqual(MIN_QUESTIONS_PER_CASE);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    expect(new Set(qs.map((q) => q.prompt)).size).toBe(qs.length);
    const types = new Set(qs.map((q) => q.type ?? "single"));
    expect(types.has("single")).toBe(true);
    expect(types.has("multi") || types.has("truefalse")).toBe(true);
    expect(new Set(qs.map((q) => q.anchor)).size).toBeGreaterThanOrEqual(3);
    const readings = (parsed.kind === "hld" ? designCaseBySlug.get(parsed.slug)?.readings : practiceCaseBySlug.get(`${parsed.kind}:${parsed.slug}`)?.readings) ?? [];
    for (const q of qs) {
      expect(CASE_ANCHORS[parsed.kind]).toContain(q.anchor);
      if (q.reading !== undefined) expect(readings[q.reading]).toBeDefined();
      expect(q.source).toEqual({ kind: "case", ref });
      expect(learnMoreFor(ref, q)?.href).toContain(`#${q.anchor}`);
      // The answer key is a valid index (single) or a non-zero bitmask (multi).
      expect(correctAnswerKey(q)).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the right answer spread across positions (no positional tell)", () => {
    const counts = new Map<number, number>();
    let total = 0;
    for (const qs of bank.values())
      for (const q of qs) {
      if ((q.type ?? "single") !== "single") continue;
      counts.set(q.answerIndex, (counts.get(q.answerIndex) ?? 0) + 1);
      total++;
    }
    for (const [, n] of counts) expect(n / total).toBeLessThan(0.45);
  });
});
