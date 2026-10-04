import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testcaseBySlug } from "@/core/content";
import { ProblemProgress } from "@/core/models/progress";
import { getProblemDetail } from "@/modules/dsa/services/problems";
import { revealHiddenCase } from "@/modules/progress/services/progress";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const slug = "two-sum";
const cases = testcaseBySlug.get(slug)!.cases;
const hiddenIndex = cases.findIndex((c) => c.hidden);
const visibleIndex = cases.findIndex((c) => !c.hidden);

describe("revealHiddenCase", () => {
  it("records a hidden case once and creates the progress row if needed", async () => {
    expect(await revealHiddenCase(slug, hiddenIndex)).toBe(true);
    expect(await revealHiddenCase(slug, hiddenIndex)).toBe(true);
    const row = await ProblemProgress.findOne({ slug }).lean();
    expect(row?.status).toBe("attempted");
    expect(row?.revealedCases).toEqual([hiddenIndex]);
    expect((await getProblemDetail(slug))?.progress?.revealedCases).toEqual([hiddenIndex]);
  });

  it("refuses visible, out-of-range, non-integer and unknown targets", async () => {
    expect(await revealHiddenCase(slug, visibleIndex)).toBe(false);
    expect(await revealHiddenCase(slug, 999)).toBe(false);
    expect(await revealHiddenCase(slug, 1.5)).toBe(false);
    expect(await revealHiddenCase("not-a-problem", 0)).toBe(false);
    expect(await ProblemProgress.countDocuments()).toBe(0);
  });

  it("never downgrades a solved problem", async () => {
    await ProblemProgress.create({ slug, status: "solved", solveDates: ["2026-01-01"] });
    await revealHiddenCase(slug, hiddenIndex);
    expect((await ProblemProgress.findOne({ slug }).lean())?.status).toBe("solved");
  });
});
