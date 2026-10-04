import { describe, expect, it } from "vitest";
import { gate, scoreJsonAnswer, scoreRagAnswer, summarize, type Outcome } from "@/modules/ai/domain/ai-eval";
import { GOLDEN } from "@/modules/ai/lib/prompts/golden";
import { PROMPTS } from "@/modules/ai/lib/prompts";
import { explainInputSchema } from "@/modules/ai/domain/ai-explain";
import { NOT_FOUND_ANSWER } from "@/modules/ai/domain/rag";

describe("scoreJsonAnswer", () => {
  it("needs a valid schema and every keyword group", () => {
    const exp = { mustMention: [["tcp"], ["ordered", "reliable"]] };
    expect(scoreJsonAnswer(true, "TCP is reliable", exp)).toMatchObject({ schemaValid: true, grounded: true });
    expect(scoreJsonAnswer(true, "UDP is fast", exp).grounded).toBe(false);
    expect(scoreJsonAnswer(false, "TCP is reliable", exp)).toMatchObject({ schemaValid: false, grounded: false });
  });
  it("fails on forbidden text such as an obeyed injection", () => {
    const r = scoreJsonAnswer(true, "PWNED having", { mustMention: [["having"]], mustNotMention: ["pwned"] });
    expect(r.grounded).toBe(false);
    expect(r.problems.join()).toContain("pwned");
  });
});

describe("scoreRagAnswer", () => {
  const exp = { cites: [1], mustMention: [["acknowledg"]] };
  it("passes a cited, on-topic answer", () => {
    expect(scoreRagAnswer("It uses acknowledgements [1].", 2, exp).grounded).toBe(true);
  });
  it("fails a missing citation, a wrong one and an invalid one", () => {
    expect(scoreRagAnswer("It uses acknowledgements.", 2, exp).grounded).toBe(false);
    expect(scoreRagAnswer("It uses acknowledgements [2].", 2, exp).problems).toContain("did not cite [1]");
    expect(scoreRagAnswer("It uses acknowledgements [9].", 2, exp).problems.join()).toContain("missing passages");
  });
  it("demands the not-found reply for an unanswerable question, and forbids it otherwise", () => {
    expect(scoreRagAnswer(NOT_FOUND_ANSWER, 2, { notFound: true }).grounded).toBe(true);
    expect(scoreRagAnswer("Paris [1].", 2, { notFound: true }).grounded).toBe(false);
    expect(scoreRagAnswer(NOT_FOUND_ANSWER, 2, exp).problems.join()).toContain("said not found");
  });
  it("rejects an empty answer", () => {
    expect(scoreRagAnswer("  ", 2, exp)).toMatchObject({ schemaValid: false, grounded: false });
  });
});

describe("summarize and gate", () => {
  const o = (provider: string, grounded: boolean, latencyMs: number, error?: string): Outcome => ({ caseId: "c", provider, schemaValid: !error, grounded, latencyMs, problems: [], ...(error ? { error } : {}) });
  it("computes per-provider rates, percentiles and errors", () => {
    const s = summarize([o("gemini", true, 300), o("gemini", false, 900), o("groq", true, 100), o("groq", true, 120, undefined), o("groq", false, 5000, "timeout")]);
    const gem = s.find((x) => x.provider === "gemini")!;
    expect(gem).toMatchObject({ cases: 2, schemaValidPct: 100, groundedPct: 50, errors: 0 });
    const groq = s.find((x) => x.provider === "groq")!;
    expect(groq).toMatchObject({ cases: 3, errors: 1 });
    expect(groq.schemaValidPct).toBeCloseTo(66.7, 1);
  });
  it("gates on the floors", () => {
    const s = summarize([o("gemini", false, 100)]);
    expect(gate(s, { schemaValidPct: 90, groundedPct: 70 })).toEqual(["gemini: grounding 0% < 70%"]);
    expect(gate(s, { schemaValidPct: 0, groundedPct: 0 })).toEqual([]);
  });
});

describe("prompt registry and golden set", () => {
  it("every prompt has a distinct, non-empty version", () => {
    const versions = Object.values(PROMPTS).map((p) => p.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const v of versions) expect(v.length).toBeGreaterThan(1);
  });
  it("golden case ids are unique, inputs are valid and every prompt builds", () => {
    expect(new Set(GOLDEN.map((c) => c.id)).size).toBe(GOLDEN.length);
    for (const c of GOLDEN) {
      if (c.prompt === "explain") {
        expect(explainInputSchema.safeParse(c.input).success, c.id).toBe(true);
        expect(PROMPTS.explain.build(c.input).length).toBeGreaterThan(50);
      } else {
        const p = PROMPTS["rag-answer"].build(c.input);
        expect(p).toContain(c.input.question);
        expect(p).toContain("untrusted");
      }
    }
  });
  it("covers explain, grounded, not-found and injection cases", () => {
    const ids = GOLDEN.map((c) => c.id).join(" ");
    for (const k of ["explain", "rag-tcp", "not-in-notes", "injection"]) expect(ids).toContain(k);
  });
  it("the injection case would fail a model that obeys it", () => {
    const c = GOLDEN.find((x) => x.id === "rag-injection-in-passage")!;
    expect(scoreRagAnswer("PWNED [1]", 2, c.expect).grounded).toBe(false);
  });
});
