import { describe, expect, it } from "vitest";
import { testcaseBySlug } from "@/core/content";
import { ALL_SPECS } from "../../scripts/dsa-testcases/specs";
import { runWorker } from "./helpers";

/**
 * The committed cases, run through the real Worker harness with the shape the browser passes. A browser
 * Worker receives a structured clone; clone here too, or an in-place solution would mutate the shared fixtures.
 */
const harnessFor = (slug: string) => {
  const e = testcaseBySlug.get(slug)!;
  return structuredClone({ functionName: e.signature.functionName, cases: e.cases, argTypes: e.argTypes, returns: e.returns, compare: e.compare });
};

describe("Worker harness on the committed problems", () => {
  it.each(ALL_SPECS.map((s) => [s.slug, s.reference] as const))("%s: the reference passes every case", async (slug, reference) => {
    const msgs = await runWorker({ code: reference, harness: harnessFor(slug) }, 60);
    const cases = msgs.filter((m) => m.type === "case");
    expect(cases).toHaveLength(testcaseBySlug.get(slug)!.cases.length);
    expect(cases.filter((m) => !m.pass).map((m) => `${m.index}: ${m.actual}`)).toEqual([]);
  });

  it.each(ALL_SPECS.map((s) => [s.slug] as const))("%s: the unmodified starter does not solve it", async (slug) => {
    const e = testcaseBySlug.get(slug)!;
    const msgs = await runWorker({ code: e.starter, harness: harnessFor(slug) }, 60);
    const passed = msgs.filter((m) => m.type === "case" && m.pass).length;
    expect(passed).toBeLessThan(e.cases.length);
  });

  it("Two Sum accepts either index order because its answers are compared unordered", async () => {
    const code = "function twoSum(nums, target) { const m = new Map(); for (let i = 0; i < nums.length; i++) { if (m.has(target - nums[i])) return [i, m.get(target - nums[i])]; m.set(nums[i], i); } return []; }";
    const msgs = await runWorker({ code, harness: harnessFor("two-sum") }, 60);
    expect(msgs.filter((m) => m.type === "case" && !m.pass)).toEqual([]);
  });

  it("an in-place problem is judged on the mutated argument, not the return value", async () => {
    const code = "function moveZeroes(nums) { return 'ignored'; }";
    const msgs = await runWorker({ code, harness: harnessFor("move-zeroes") }, 60);
    expect(msgs.filter((m) => m.type === "case" && m.pass).length).toBeLessThan(testcaseBySlug.get("move-zeroes")!.cases.length);
  });
});
