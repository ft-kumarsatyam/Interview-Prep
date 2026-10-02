import { describe, expect, it } from "vitest";
import { planSync, type Submission } from "@/lib/domain/leetcode";

const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const base = {
  knownSlugs: new Set(["two-sum", "valid-anagram", "3sum"]),
  solveDates: new Map<string, string[]>(),
  seenIds: new Set<string>(),
  timeZone: "Asia/Kolkata",
  today: "2026-10-08",
};

describe("planSync", () => {
  it("dates submissions in the app timezone, across the IST midnight edge", () => {
    const subs: Submission[] = [
      { id: "1", titleSlug: "two-sum", timestamp: sec("2026-10-06T18:29:00Z") }, // 23:59 IST on the 6th
      { id: "2", titleSlug: "valid-anagram", timestamp: sec("2026-10-06T18:31:00Z") }, // 00:01 IST on the 7th
    ];
    expect(planSync({ ...base, submissions: subs }).intents).toEqual([
      { slug: "two-sum", date: "2026-10-06", submissionId: "1" },
      { slug: "valid-anagram", date: "2026-10-07", submissionId: "2" },
    ]);
  });

  it("orders oldest first and keeps one solve per problem per day", () => {
    const subs: Submission[] = [
      { id: "3", titleSlug: "3sum", timestamp: sec("2026-10-07T10:00:00Z") },
      { id: "2", titleSlug: "3sum", timestamp: sec("2026-10-07T08:00:00Z") },
      { id: "1", titleSlug: "3sum", timestamp: sec("2026-10-05T08:00:00Z") },
    ];
    expect(planSync({ ...base, submissions: subs }).intents.map((i) => [i.date, i.submissionId])).toEqual([
      ["2026-10-05", "1"],
      ["2026-10-07", "2"],
    ]);
  });

  it("skips seen ids, already-logged days and untracked problems", () => {
    const subs: Submission[] = [
      { id: "seen", titleSlug: "two-sum", timestamp: sec("2026-10-07T08:00:00Z") },
      { id: "logged", titleSlug: "valid-anagram", timestamp: sec("2026-10-07T08:00:00Z") },
      { id: "other", titleSlug: "some-premium-problem", timestamp: sec("2026-10-07T08:00:00Z") },
    ];
    const plan = planSync({
      ...base,
      submissions: subs,
      seenIds: new Set(["seen"]),
      solveDates: new Map([["valid-anagram", ["2026-10-07"]]]),
    });
    expect(plan.intents).toEqual([]);
    expect(plan.untracked).toEqual(["some-premium-problem"]);
  });
});
