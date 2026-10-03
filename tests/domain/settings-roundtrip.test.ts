import { describe, expect, it } from "vitest";
import { mergeSections, settingsInputSchema } from "@/lib/domain/settings";
import { settingsToInput } from "@/lib/services/settings-input";
import type { AppSettings } from "@/lib/services/settings";

// Only the fields settingsToInput reads.
const stored = {
  startDate: "2026-10-05",
  endDate: "2027-03-20",
  quizPassPct: 70,
  topicMasteryPct: 80,
  minDailyDsa: 2,
  maxDailyDsa: 5,
  maxSaturdayDsa: 6,
  maxDailyTheory: 3,
  revisionWeeks: 3,
  restDays: ["2026-12-25"],
  geminiLinks: {},
  llmPaid: { enabled: false, dailyCap: 0, requireConfirm: true },
  mockSchedule: { dsaWeekday: 2, hldWeekday: 4 },
  hoursByDow: null,
  googleNewsQueries: null,
  leetcodeUsername: null,
} as unknown as AppSettings;

describe("settingsToInput", () => {
  it("round-trips stored settings through the schema, including a missing LeetCode username", () => {
    const input = settingsToInput(stored);
    expect(input.hoursByDow).toHaveLength(7);
    const parsed = settingsInputSchema.safeParse({ ...input, leetcodeUsername: input.leetcodeUsername ?? "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.leetcodeUsername).toBeNull();
  });

  it("lets one section save while another section holds an invalid value", () => {
    const base = settingsToInput(stored);
    const submitted = { ...base, maxDailyDsa: 1, minDailyDsa: 9, quizPassPct: 90 };
    const targets = settingsInputSchema.safeParse({ ...mergeSections(base, submitted, ["targets"]), leetcodeUsername: "" });
    const plan = settingsInputSchema.safeParse({ ...mergeSections(base, { ...submitted, endDate: "2027-05-01" }, ["plan"]), leetcodeUsername: "" });
    expect(targets.success).toBe(false);
    expect(plan.success).toBe(true);
  });
});
