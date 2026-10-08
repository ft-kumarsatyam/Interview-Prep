import { describe, expect, it } from "vitest";
import { problems } from "@/core/content";
import { COMPANY_BY_SLUG, attachCompanyTags, companyNames } from "@/modules/dsa/domain/company-tags";
import { elapsedSecondsAt, minutesFromSeconds, toggleTimer, type ExternalQuestion, type TimerState } from "@/modules/dsa/domain/external-catalogue";

describe("company tags", () => {
  it("falls back to the NeetCode list without a dataset", () => {
    const question = { id: "two-sum", sheetId: "sheet", order: 1, section: "Arrays", category: "Arrays & Hashing", difficulty: "Easy", title: "Two Sum", localSlug: "two-sum", links: [], companies: [], sourceCoverage: "exact" } satisfies ExternalQuestion;
    const tagged = attachCompanyTags(question, problems);
    expect(companyNames([tagged])).toContain("Amazon");
    expect(attachCompanyTags({ ...question, localSlug: undefined, title: "Pattern 1" }, problems).companies).toEqual([]);
    expect(Object.keys(COMPANY_BY_SLUG).every((slug) => problems.some((problem) => problem.slug === slug))).toBe(true);
  });
});

describe("external question timer", () => {
  it("starts, pauses, and rounds saved time to minutes", () => {
    const started = toggleTimer({ elapsedSeconds: 0, running: false, startedAt: null }, 1_000);
    expect(started.running).toBe(true);
    expect(elapsedSecondsAt(started, 91_000)).toBe(90);
    const paused = toggleTimer(started, 91_000);
    expect(paused).toEqual({ elapsedSeconds: 90, running: false, startedAt: null });
    expect(minutesFromSeconds(paused.elapsedSeconds)).toBe(2);
  });

  it("does not allow a clock to run backwards", () => {
    const state: TimerState = { elapsedSeconds: 30, running: true, startedAt: 2_000 };
    expect(elapsedSecondsAt(state, 1_000)).toBe(30);
  });
});
