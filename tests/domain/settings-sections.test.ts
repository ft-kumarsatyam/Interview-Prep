import { describe, expect, it } from "vitest";
import { SETTINGS_SECTION_IDS, SETTINGS_SECTION_KEYS, changedSections, mergeSections, sectionOfPath, settingsInputSchema } from "@/modules/settings/domain/settings";

const base = {
  startDate: "2026-10-05",
  endDate: "2027-03-20",
  quizPassPct: 70,
  topicMasteryPct: 80,
  minDailyDsa: 2,
  maxDailyDsa: 5,
  maxSaturdayDsa: 6,
  maxDailyTheory: 3,
  revisionWeeks: 3,
  restDays: [],
  geminiLinks: {},
  googleNewsQueries: null,
  leetcodeUsername: "me",
};

describe("settings sections", () => {
  it("covers every schema key exactly once", () => {
    const all = SETTINGS_SECTION_IDS.flatMap((id) => [...SETTINGS_SECTION_KEYS[id]]);
    expect(new Set(all).size).toBe(all.length);
    expect(all.toSorted()).toEqual(Object.keys(settingsInputSchema.shape).toSorted());
  });

  it("maps validation paths to sections", () => {
    expect(sectionOfPath("endDate")).toBe("plan");
    expect(sectionOfPath("hoursByDow.3")).toBe("plan");
    expect(sectionOfPath("geminiLinks.dsa")).toBe("integrations");
    expect(sectionOfPath("minDailyDsa")).toBe("targets");
    expect(sectionOfPath("nope")).toBeUndefined();
  });

  it("detects which sections changed, deeply", () => {
    expect(changedSections(base, base)).toEqual([]);
    expect(changedSections({ ...base, minDailyDsa: 3 }, base)).toEqual(["targets"]);
    expect(changedSections({ ...base, geminiLinks: { dsa: "x" }, endDate: "2027-04-01" }, base)).toEqual(["plan", "integrations"]);
  });

  it("merges only the requested sections, so another section's bad value never leaks in", () => {
    const submitted = { ...base, minDailyDsa: 9, maxDailyDsa: 1, endDate: "2027-04-01" };
    const merged = mergeSections(base, submitted, ["plan"]);
    expect(merged.endDate).toBe("2027-04-01");
    expect(merged.minDailyDsa).toBe(2);
    expect(settingsInputSchema.safeParse(merged).success).toBe(true);
    expect(settingsInputSchema.safeParse(mergeSections(base, submitted, ["targets"])).success).toBe(false);
  });
});
