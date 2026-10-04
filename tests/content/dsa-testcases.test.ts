import { describe, expect, it } from "vitest";
import { problemBySlug, testcaseBySlug } from "@/core/content";
import { EDGE_IDS } from "@/modules/dsa/domain/edge-cases";
import { buildEntry } from "../../scripts/dsa-testcases/build";
import { lintSpec } from "../../scripts/dsa-testcases/lint";
import { ALL_SPECS } from "../../scripts/dsa-testcases/specs";
import type { ProblemSpec } from "../../scripts/dsa-testcases/types";

describe("authored DSA problems", () => {
  it("every spec has a unique slug and is in the committed data", () => {
    const slugs = ALL_SPECS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(testcaseBySlug.has(slug), `${slug} missing from data/dsa-testcases.json`).toBe(true);
    expect(testcaseBySlug.size).toBe(slugs.length);
  });

  // Re-running the reference solutions against the committed JSON means an edited solution, brute force or
  // case that wasn't regenerated fails the build instead of shipping a wrong expected value.
  it.each(ALL_SPECS.map((s) => [s.slug, s] as const))("%s matches its committed test cases and passes the quality lint", (slug, spec) => {
    const { entry, errors } = buildEntry(spec, { slugExists: problemBySlug.has(slug) });
    expect(errors).toEqual([]);
    expect(testcaseBySlug.get(slug)).toEqual(entry);
  });

  it.each([...testcaseBySlug.entries()])("%s has a 3-step hint ladder and known edge ids", (_slug, entry) => {
    expect(entry.hints.map((h) => h.kind)).toEqual(["nudge", "approach", "pseudocode"]);
    for (const c of entry.cases) if (c.edge) expect(EDGE_IDS).toContain(c.edge);
  });
});

describe("lintSpec", () => {
  const base: ProblemSpec = {
    slug: "two-sum",
    functionName: "f",
    params: ["x"],
    returnType: "number",
    starter: "function f(x) {}",
    hints: ["a nudge that is long enough", "the key idea, long enough", "set result to the input\nreturn the result"],
    reference: "function f(x) { return x; }",
    brute: "function f(x) { return x; }",
    fuzz: "function gen(r) { return [r()]; }",
    cases: [
      { input: [1], hidden: false },
      { input: [2], hidden: false },
      { input: [3], hidden: false, edge: "single" },
      { input: [4], hidden: true, edge: "zeros" },
      { input: [5], hidden: true, edge: "extremes" },
    ],
  };
  const lint = (over: Partial<ProblemSpec>, ctx = { slugExists: true, starterPasses: 0 }) => lintSpec({ ...base, ...over }, ctx);

  it("accepts a well-formed spec", () => {
    expect(lint({})).toEqual([]);
  });

  it("flags duplicate inputs, a missing slug and a trivial starter", () => {
    expect(lint({ cases: [...base.cases, { input: [1], hidden: true }] }).join()).toContain("duplicate input");
    expect(lint({}, { slugExists: false, starterPasses: 0 }).join()).toContain("not in data/dsa-problems.json");
    expect(lint({}, { slugExists: true, starterPasses: 4 }).join()).toContain("starter already passes");
  });

  it("requires enough edge cases, hidden cases and non-JS pseudocode", () => {
    expect(lint({ cases: base.cases.map((c) => ({ ...c, edge: undefined })) }).join()).toContain("at least 3 edge cases");
    expect(lint({ cases: base.cases.map((c) => ({ ...c, hidden: false })) }).join()).toContain("hidden cases");
    expect(lint({ hints: [base.hints[0], base.hints[1], "const x = () => 1;"] }).join()).toContain("not JavaScript");
    expect(lint({ hints: [base.hints[0], base.hints[1], Array(13).fill("step").join("\n")] }).join()).toContain("longer than");
  });

  it("flags a note without an edge tag", () => {
    expect(lint({ cases: [...base.cases, { input: [9], hidden: true, note: "why" }] }).join()).toContain("note only makes sense");
  });
});

describe("buildEntry cross-checks", () => {
  const spec: ProblemSpec = {
    slug: "two-sum",
    functionName: "f",
    params: ["x"],
    returnType: "number",
    starter: "function f(x) {}",
    hints: ["a nudge that is long enough", "the key idea, long enough", "set result to the input\nreturn the result"],
    reference: "function f(x) { return x * 2; }",
    brute: "function f(x) { return x + x; }",
    fuzz: "function gen(r) { return [Math.floor(r() * 50)]; }",
    cases: [
      { input: [1], hidden: false },
      { input: [2], hidden: false },
      { input: [3], hidden: false, edge: "single" },
      { input: [4], hidden: true, edge: "zeros" },
      { input: [5], hidden: true, edge: "extremes" },
    ],
  };

  it("computes expected from the reference, never from the spec", () => {
    const { entry, errors } = buildEntry(spec, { slugExists: true });
    expect(errors).toEqual([]);
    expect(entry.cases.map((c) => c.expected)).toEqual([2, 4, 6, 8, 10]);
  });

  it("fails when the brute force disagrees with the reference", () => {
    const { errors } = buildEntry({ ...spec, brute: "function f(x) { return x + 1; }" }, { slugExists: true });
    expect(errors.join()).toContain("brute force disagrees");
  });

  it("fails when only a random input exposes a disagreement", () => {
    const { errors } = buildEntry({ ...spec, brute: "function f(x) { return x === 37 ? -1 : x + x; }", fuzz: "function gen(r) { return [Math.floor(r() * 50)]; }" }, { slugExists: true });
    expect(errors.join()).toContain("fuzz disagreement");
  });
});
