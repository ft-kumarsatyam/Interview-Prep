import { describe, expect, it } from "vitest";
import { extraProblems, testcaseBySlug } from "@/core/content";
import { workerLib } from "@/core/sandbox/worker-lib-node";
import { loadSolution } from "../../scripts/dsa-testcases/vm-runner";
import { SOLUTIONS as set1 } from "../../scripts/dsa-verify/set1";
import { SOLUTIONS as set2 } from "../../scripts/dsa-verify/set2";
import { SOLUTIONS as set3 } from "../../scripts/dsa-verify/set3";
import { SOLUTIONS as set4 } from "../../scripts/dsa-verify/set4";
import { SOLUTIONS as set5 } from "../../scripts/dsa-verify/set5";
import { SOLUTIONS as set6 } from "../../scripts/dsa-verify/set6";
import { SOLUTIONS as set7 } from "../../scripts/dsa-verify/set7";
import { SOLUTIONS as set8 } from "../../scripts/dsa-verify/set8";
import { SOLUTIONS as set9 } from "../../scripts/dsa-verify/set9";
import { SOLUTIONS as set10 } from "../../scripts/dsa-verify/set10";
import { SOLUTIONS as set11 } from "../../scripts/dsa-verify/set11";
import { SOLUTIONS as set12 } from "../../scripts/dsa-verify/set12";
import { SOLUTIONS as set13 } from "../../scripts/dsa-verify/set13";
import { SOLUTIONS as set14 } from "../../scripts/dsa-verify/set14";
import { SOLUTIONS as set15 } from "../../scripts/dsa-verify/set15";
import { SOLUTIONS as set16 } from "../../scripts/dsa-verify/set16";
import { SOLUTIONS as set17 } from "../../scripts/dsa-verify/set17";
import { SOLUTIONS as set18 } from "../../scripts/dsa-verify/set18";
import { SOLUTIONS as set19 } from "../../scripts/dsa-verify/set19";
import { SOLUTIONS as set20 } from "../../scripts/dsa-verify/set20";

/**
 * A third, independently written solution per seeded problem (written without seeing the stored answers). If the
 * committed expected values ever change, or one was wrong, this fails alongside the reference/brute checks.
 * Extra problems are covered by their own reference and brute force in dsa-testcases.test.ts.
 */
const all = { ...set1, ...set2, ...set3, ...set4, ...set5, ...set6, ...set7, ...set8, ...set9, ...set10, ...set11, ...set12, ...set13, ...set14, ...set15, ...set16, ...set17, ...set18, ...set19, ...set20 };
const extraSlugs = new Set(extraProblems.map((p) => p.slug));

describe("blind solutions agree with data/dsa-testcases.json", () => {
  it("cover every seeded problem", () => {
    const seeded = [...testcaseBySlug.keys()].filter((slug) => !extraSlugs.has(slug));
    expect(seeded.filter((slug) => !(slug in all))).toEqual([]);
    expect(Object.keys(all).filter((slug) => !testcaseBySlug.has(slug))).toEqual([]);
  });

  it.each(Object.entries(all))("%s", (slug, source) => {
    const entry = testcaseBySlug.get(slug)!;
    const run = loadSolution(source, entry.signature.functionName, { argTypes: entry.argTypes, returns: entry.returns });
    const lib = workerLib();
    const bad = entry.cases.flatMap((c, i) => (lib.matches(run(structuredClone(c.input)), c.expected, entry.compare ?? "exact") ? [] : [i]));
    expect(bad).toEqual([]);
  });
});
