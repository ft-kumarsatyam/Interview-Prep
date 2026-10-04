import { describe, expect, it } from "vitest";
import { problemBySlug, testcaseBySlug } from "@/core/content";
import { describeFailure, edgeCaseIndices, effectiveCases, nextHint, normaliseHints, pickRevealCase, remapSubset, remapToFullIndex, summarizeCases, visibleCases } from "@/modules/dsa/domain/dsa-runner";

describe("summarizeCases", () => {
  it("counts passes and only reports allPassed when every case ran and passed", () => {
    expect(
      summarizeCases([
        { index: 0, pass: true, actual: "1", hidden: false },
        { index: 1, pass: true, actual: "2", hidden: true },
      ]),
    ).toEqual({ passed: 2, total: 2, allPassed: true });
  });
  it("is not allPassed when one case fails", () => {
    const summary = summarizeCases([
      { index: 0, pass: true, actual: "1", hidden: false },
      { index: 1, pass: false, actual: "x", hidden: false },
    ]);
    expect(summary).toEqual({ passed: 1, total: 2, allPassed: false });
  });
  it("is not allPassed on an empty result (nothing actually ran)", () => {
    expect(summarizeCases([]).allPassed).toBe(false);
  });
});

describe("visibleCases", () => {
  it("drops hidden cases", () => {
    const cases = [
      { input: [1], expected: 1, hidden: false },
      { input: [2], expected: 2, hidden: true },
    ];
    expect(visibleCases(cases)).toEqual([cases[0]]);
  });
});

describe("nextHint", () => {
  const hints = ["a", "b"];
  it("returns the next unrevealed hint", () => {
    expect(nextHint(hints, 0)).toBe("a");
    expect(nextHint(hints, 1)).toBe("b");
  });
  it("returns undefined once every hint is revealed", () => {
    expect(nextHint(hints, 2)).toBeUndefined();
  });
});

describe("data/dsa-testcases.json", () => {
  const entries = [...testcaseBySlug.entries()];

  it("is non-empty and keyed only by real problem slugs", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [slug] of entries) expect(problemBySlug.has(slug)).toBe(true);
  });

  it.each(entries)("%s has a valid signature, starter, cases and hints", (slug, entry) => {
    expect(entry.signature.functionName).toMatch(/^[a-zA-Z_$][\w$]*$/);
    expect(entry.starter).toContain(entry.signature.functionName);
    expect(entry.cases.length).toBeGreaterThan(0);
    expect(entry.cases.some((c) => !c.hidden)).toBe(true);
    for (const c of entry.cases) expect(Array.isArray(c.input)).toBe(true);
    expect(entry.hints.length).toBeGreaterThan(0);
  });
});

describe("describeFailure", () => {
  const cases = [
    { input: [[2, 7], 9], expected: [0, 1], hidden: false },
    { input: [[3, 3], 6], expected: [0, 1], hidden: true },
  ];

  it("is undefined before anything ran", () => {
    expect(describeFailure(cases, [])).toBeUndefined();
  });

  it("says when everything passed", () => {
    expect(describeFailure(cases, [{ index: 0, pass: true, actual: "x", hidden: false }])).toBe("All 1 cases passed.");
  });

  it("describes the first failing visible case with input, expected and actual", () => {
    const text = describeFailure(cases, [
      { index: 0, pass: false, actual: "[ 1, 0 ]", hidden: false },
      { index: 1, pass: false, actual: "[]", hidden: true },
    ]);
    expect(text).toBe("2 of 2 cases failed. First visible failure: input [[2,7],9], expected [0,1], got [ 1, 0 ].");
  });

  it("never reveals a hidden case's input or expected value", () => {
    const text = describeFailure(cases, [{ index: 1, pass: false, actual: "[]", hidden: true }]);
    expect(text).toBe("1 of 1 cases failed. (Only hidden cases failed.)");
    expect(text).not.toContain("[3,3]");
  });

  it("truncates a huge value", () => {
    const big = [{ input: ["x".repeat(500)], expected: 1, hidden: false }];
    expect(describeFailure(big, [{ index: 0, pass: false, actual: "2", hidden: false }])!.length).toBeLessThan(400);
  });
});

describe("remapToFullIndex", () => {
  // hidden case first: the case that exposed the old index mix-up
  const cases = [
    { input: [1], expected: 1, hidden: true },
    { input: [2], expected: 2, hidden: false },
    { input: [3], expected: 3, hidden: true },
    { input: [4], expected: 4, hidden: false },
  ];

  it("maps a visible-only run back to positions in the full list", () => {
    const res = [
      { index: 0, pass: true, actual: "2", hidden: false },
      { index: 1, pass: false, actual: "9", hidden: false },
    ];
    expect(remapToFullIndex(cases, res, true).map((r) => [r.index, r.pass])).toEqual([
      [1, true],
      [3, false],
    ]);
  });

  it("leaves a full Submit run untouched", () => {
    const res = [{ index: 2, pass: true, actual: "3", hidden: true }];
    expect(remapToFullIndex(cases, res, false)).toEqual(res);
  });

  it("drops a result that has no matching case instead of mislabelling it", () => {
    expect(remapToFullIndex(cases, [{ index: 5, pass: true, actual: "", hidden: false }], true)).toEqual([]);
  });

  it("keeps describeFailure pointing at the right case afterwards", () => {
    const remapped = remapToFullIndex(cases, [{ index: 1, pass: false, actual: "0", hidden: false }], true);
    expect(describeFailure(cases, remapped)).toContain("input [4], expected 4, got 0");
  });
});

describe("hint ladder and hidden-case reveal", () => {
  const cases = [
    { input: [1], expected: 1, hidden: false },
    { input: [2], expected: 2, hidden: true, edge: "single" as const },
    { input: [3], expected: 3, hidden: true },
    { input: [4], expected: 4, hidden: false, edge: "zeros" as const },
  ];
  const outcome = (index: number, pass: boolean) => ({ index, pass, actual: "x", hidden: cases[index]!.hidden });

  it("reads flat v1 hints as nudge, approach, then pseudocode", () => {
    expect(normaliseHints(["a", "b"]).map((h) => [h.level, h.kind])).toEqual([
      [1, "nudge"],
      [2, "approach"],
    ]);
    expect(normaliseHints(["a", "b", "c", "d"]).at(-1)).toMatchObject({ level: 3, kind: "pseudocode" });
    const full = { level: 2 as const, kind: "approach" as const, text: "keep" };
    expect(normaliseHints([full])).toEqual([full]);
  });

  it("reveals the first failing hidden case, once", () => {
    const results = [outcome(0, false), outcome(1, false), outcome(2, false)];
    expect(pickRevealCase(cases, results, [])).toBe(1);
    expect(pickRevealCase(cases, results, [1])).toBe(2);
    expect(pickRevealCase(cases, results, [1, 2])).toBeUndefined();
  });

  it("reveals nothing when hidden cases pass or only visible ones fail", () => {
    expect(pickRevealCase(cases, [outcome(0, false), outcome(1, true)], [])).toBeUndefined();
  });

  it("makes revealed cases visible", () => {
    expect(effectiveCases(cases, [2]).map((c) => c.hidden)).toEqual([false, true, false, false]);
  });

  it("lists visible edge cases for 'run all edges' and maps subset results back", () => {
    expect(edgeCaseIndices(cases)).toEqual([3]);
    expect(edgeCaseIndices(effectiveCases(cases, [1]))).toEqual([1, 3]);
    expect(remapSubset([3, 1], [{ index: 0, pass: true }, { index: 1, pass: false }, { index: 2, pass: true }])).toEqual([
      { index: 3, pass: true },
      { index: 1, pass: false },
    ]);
  });
});
