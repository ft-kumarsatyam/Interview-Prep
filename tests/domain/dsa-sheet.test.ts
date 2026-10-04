import { describe, expect, it } from "vitest";
import { problems } from "@/core/content";
import { groupByStep, STEP_ORDER, stepOf, stepProgress } from "@/modules/dsa/domain/dsa-sheet";

const main = problems.filter((p) => p.track === "main");

describe("stepOf", () => {
  it("falls back to pattern when no override is set", () => {
    expect(stepOf({ pattern: "Trees" } as never)).toBe("Trees");
  });
  it("uses the override when present", () => {
    expect(stepOf({ pattern: "Bit Manipulation", step: "Basics & Complexity" } as never)).toBe("Basics & Complexity");
  });
});

describe("groupByStep", () => {
  it("orders groups by STEP_ORDER, not insertion order", () => {
    const sample = [
      { slug: "a", pattern: "Trees", order: 1 } as never,
      { slug: "b", pattern: "Arrays & Hashing", order: 2 } as never,
    ];
    expect(groupByStep(sample).map((g) => g.step)).toEqual(["Arrays & Hashing", "Trees"]);
  });
  it("sorts an unrecognised step last instead of dropping it", () => {
    const sample = [{ slug: "a", pattern: "Something New", order: 1 } as never, { slug: "b", pattern: "Trees", order: 2 } as never];
    const groups = groupByStep(sample);
    expect(groups.map((g) => g.step)).toEqual(["Trees", "Something New"]);
    expect(groups.at(-1)?.rank).toBe(Infinity);
  });
  it("keeps each group's problems in their existing `order`", () => {
    const sample = [
      { slug: "b", pattern: "Trees", order: 2 } as never,
      { slug: "a", pattern: "Trees", order: 1 } as never,
    ];
    expect(groupByStep(sample)[0]?.problems.map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("stepProgress", () => {
  it("tallies solved vs total", () => {
    const solved = new Set(["a"]);
    const tally = stepProgress([{ slug: "a" } as never, { slug: "b" } as never], (s) => solved.has(s));
    expect(tally).toEqual({ solved: 1, total: 2, complete: false });
  });
  it("is never complete for an empty step", () => {
    expect(stepProgress([], () => true).complete).toBe(false);
  });
});

describe("data/dsa-problems.json sheet coverage", () => {
  it("every main-track problem's step resolves to a step in STEP_ORDER", () => {
    for (const p of main) expect(STEP_ORDER).toContain(stepOf(p));
  });

  it("groupByStep over every main problem covers every step with no leftovers", () => {
    const groups = groupByStep(main);
    expect(groups.every((g) => Number.isFinite(g.rank))).toBe(true);
    expect(groups.reduce((n, g) => n + g.problems.length, 0)).toBe(main.length);
  });

  it("re-slotted problems keep their original pattern/tier/track/order (additive-only change)", () => {
    const expected: Record<string, { pattern: string; tier: string; order: number }> = {
      "happy-number": { pattern: "Arrays & Hashing", tier: "core", order: 6 },
      "sort-colors": { pattern: "Arrays & Hashing", tier: "core", order: 18 },
      "reverse-integer": { pattern: "Bit Manipulation", tier: "core", order: 148 },
      "merge-sorted-array": { pattern: "Arrays & Hashing", tier: "extended", order: 155 },
      "h-index": { pattern: "Arrays & Hashing", tier: "extended", order: 186 },
      "largest-number": { pattern: "Greedy", tier: "extended", order: 410 },
      "power-of-two": { pattern: "Bit Manipulation", tier: "extended", order: 551 },
      "palindrome-number": { pattern: "Math & Geometry", tier: "extended", order: 567 },
      "count-primes": { pattern: "Math & Geometry", tier: "extended", order: 568 },
      "factorial-trailing-zeroes": { pattern: "Math & Geometry", tier: "extended", order: 569 },
    };
    for (const [slug, want] of Object.entries(expected)) {
      const p = main.find((x) => x.slug === slug);
      expect(p, `${slug} should still exist`).toBeDefined();
      expect({ pattern: p?.pattern, tier: p?.tier, order: p?.order }).toEqual(want);
    }
  });

  it("the two new sorting problems are real, distinct additions", () => {
    for (const slug of ["sort-an-array", "relative-sort-array"]) {
      const p = main.find((x) => x.slug === slug);
      expect(p).toBeDefined();
      expect(p?.step).toBe("Sorting Algorithms");
    }
  });
});
