import { describe, expect, it } from "vitest";
import { mergeRestDays, normaliseQueries, settingsInputSchema } from "@/lib/domain/settings";
import { coverage, cumulativeVsIdeal, difficultyByWeek, quizTrend, solvesPerDay, topicMastery, type SolveRow } from "@/lib/domain/stats";

const row = (slug: string, difficulty: SolveRow["difficulty"], solveDates: string[], main = true): SolveRow => ({ slug, difficulty, main, solveDates });

describe("stats", () => {
  const rows = [
    row("a", "Easy", ["2026-10-05", "2026-10-19"]),
    row("b", "Medium", ["2026-10-06"]),
    row("c", "Hard", ["2026-10-13"]),
    row("js", "Easy", ["2026-10-06"], false),
  ];

  it("counts solves per day including re-solves", () => {
    const days = solvesPerDay(rows, "2026-10-19", 15);
    expect(days).toHaveLength(15);
    expect(days[0]).toEqual({ date: "2026-10-05", count: 1 });
    expect(days.find((d) => d.date === "2026-10-06")?.count).toBe(2);
    expect(days.at(-1)).toEqual({ date: "2026-10-19", count: 1 });
  });

  it("tracks distinct main-track first solves against the ideal", () => {
    const curve = cumulativeVsIdeal(rows, "2026-10-05", "2027-03-21", "2026-10-07", (d) => (d === "2026-10-07" ? 9 : 3));
    expect(curve).toEqual([
      { date: "2026-10-05", actual: 1, ideal: 3 },
      { date: "2026-10-06", actual: 2, ideal: 3 },
      { date: "2026-10-07", actual: 2, ideal: 9 },
    ]);
    expect(cumulativeVsIdeal(rows, "2026-10-05", "2027-03-21", "2026-10-01", () => 0)).toEqual([]);
  });

  it("splits first solves by plan week and difficulty", () => {
    expect(difficultyByWeek(rows, "2026-10-05", "2026-10-19")).toEqual([
      { week: 1, Easy: 2, Medium: 1, Hard: 0 },
      { week: 2, Easy: 0, Medium: 0, Hard: 1 },
      { week: 3, Easy: 0, Medium: 0, Hard: 0 },
    ]);
  });

  it("orders attempted quizzes and drops unattempted ones", () => {
    expect(
      quizTrend([
        { date: "2026-10-07", kind: "daily", bestPct: 80, attempted: true },
        { date: "2026-10-06", kind: "daily", bestPct: 50, attempted: true },
        { date: "2026-10-08", kind: "daily", bestPct: 0, attempted: false },
      ]),
    ).toEqual([
      { date: "2026-10-06", kind: "daily", pct: 50 },
      { date: "2026-10-07", kind: "daily", pct: 80 },
    ]);
  });

  it("computes coverage and topic mastery", () => {
    expect(coverage([{ key: "js", label: "JS", ids: ["a", "b", "c"] }], new Set(["a"]))).toEqual([{ key: "js", label: "JS", done: 1, total: 3, pct: 33 }]);
    const radar = topicMastery(
      [
        { id: "t1", title: "T1", subtopicIds: ["t1:0", "t1:1"] },
        { id: "t2", title: "T2", subtopicIds: ["t2:0"] },
      ],
      new Map([["t1:0", 80], ["t2", 90], ["t2:0", 10]]),
      new Set(["t2"]),
    );
    expect(radar).toEqual([
      { topicId: "t1", title: "T1", score: 40, mastered: false },
      { topicId: "t2", title: "T2", score: 90, mastered: true },
    ]);
  });
});

describe("settings rules", () => {
  const base = {
    startDate: "2026-10-05",
    endDate: "2027-03-21",
    quizPassPct: 60,
    topicMasteryPct: 70,
    minDailyDsa: 3,
    maxDailyDsa: 6,
    maxSaturdayDsa: 10,
    maxDailyTheory: 5,
    revisionWeeks: 3,
    restDays: [],
    googleNewsQueries: null,
    leetcodeUsername: "",
  };

  it("accepts a valid form and normalises the username", () => {
    const parsed = settingsInputSchema.parse({ ...base, leetcodeUsername: " @kumar_s-1 " });
    expect(parsed.leetcodeUsername).toBe("kumar_s-1");
    expect(settingsInputSchema.parse(base).leetcodeUsername).toBeNull();
  });

  it("rejects inverted dates, min > max, bad usernames and out-of-range marks", () => {
    const issues = (patch: object) => settingsInputSchema.safeParse({ ...base, ...patch }).error?.issues.map((i) => i.path.join("."));
    expect(issues({ endDate: "2026-10-01" })).toContain("endDate");
    expect(issues({ minDailyDsa: 9 })).toContain("minDailyDsa");
    expect(issues({ leetcodeUsername: "bad name" })).toContain("leetcodeUsername");
    expect(issues({ quizPassPct: 20 })).toContain("quizPassPct");
    expect(issues({ endDate: "2028-01-01" })).toContain("endDate");
  });

  it("keeps past rest days and only accepts future ones", () => {
    expect(mergeRestDays(["2026-10-01", "2026-10-09"], ["2026-10-03", "2026-10-12", "2026-10-02"], "2026-10-02")).toEqual(["2026-10-01", "2026-10-03", "2026-10-12"]);
  });

  it("stores defaults as null", () => {
    expect(normaliseQueries(["A", "B"], ["A", "B"])).toBeNull();
    expect(normaliseQueries(["A", " A ", "C"], ["A", "B"])).toEqual(["A", "C"]);
    expect(normaliseQueries([], ["A"])).toBeNull();
  });
});
