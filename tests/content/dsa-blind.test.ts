import { describe, expect, it } from "vitest";
import { testcaseBySlug } from "@/lib/content";
import { workerLib } from "@/lib/sandbox/worker-lib-node";
import { loadSolution } from "../../scripts/dsa-testcases/vm-runner";
import { SOLUTIONS as set1 } from "../../scripts/dsa-verify/set1";
import { SOLUTIONS as set2 } from "../../scripts/dsa-verify/set2";
import { SOLUTIONS as set3 } from "../../scripts/dsa-verify/set3";
import { SOLUTIONS as set4 } from "../../scripts/dsa-verify/set4";

/**
 * A third, independently written solution per problem (written without seeing the stored answers). If the
 * committed expected values ever change, or one was wrong, this fails alongside the reference/brute checks.
 */
const all = { ...set1, ...set2, ...set3, ...set4 };

describe("blind solutions agree with data/dsa-testcases.json", () => {
  it("cover every problem", () => {
    expect(Object.keys(all).sort()).toEqual([...testcaseBySlug.keys()].sort());
  });

  it.each(Object.entries(all))("%s", (slug, source) => {
    const entry = testcaseBySlug.get(slug)!;
    const run = loadSolution(source, entry.signature.functionName, { argTypes: entry.argTypes, returns: entry.returns });
    const lib = workerLib();
    const bad = entry.cases.flatMap((c, i) => (lib.matches(run(structuredClone(c.input)), c.expected, entry.compare ?? "exact") ? [] : [i]));
    expect(bad).toEqual([]);
  });
});
