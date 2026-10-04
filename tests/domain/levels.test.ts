import { describe, expect, it } from "vitest";
import { countByLevel, recommendedLevel, summarizeLevels, type LevelAttempt } from "@/modules/quiz/domain/levels";

const at = (d: string) => new Date(`${d}T10:00:00Z`);
const avail = { easy: 20, medium: 15, hard: 8 };
const a = (level: LevelAttempt["level"], pct: number, d: string): LevelAttempt => ({ level, pct, at: at(d) });

describe("summarizeLevels", () => {
  it("gives one row per level in easy, medium, hard order even with no attempts", () => {
    const rows = summarizeLevels([], avail, 70);
    expect(rows.map((r) => r.level)).toEqual(["easy", "medium", "hard"]);
    expect(rows[0]).toMatchObject({ available: 20, attempts: 0, bestPct: null, recent: [], lastAt: null, cleared: false });
  });
  it("tracks attempts, best, recent scores newest first, and the last date per level", () => {
    const rows = summarizeLevels([a("easy", 50, "2026-01-01"), a("easy", 90, "2026-01-03"), a("easy", 70, "2026-01-02"), a("hard", 30, "2026-01-04")], avail, 70);
    expect(rows[0]).toMatchObject({ attempts: 3, bestPct: 90, recent: [90, 70, 50], cleared: true, lastAt: at("2026-01-03").toISOString() });
    expect(rows[2]).toMatchObject({ attempts: 1, bestPct: 30, cleared: false });
    expect(rows[1].attempts).toBe(0);
  });
  it("clears at exactly the pass mark, not below it", () => {
    expect(summarizeLevels([a("medium", 70, "2026-01-01")], avail, 70)[1]!.cleared).toBe(true);
    expect(summarizeLevels([a("medium", 69, "2026-01-01")], avail, 70)[1]!.cleared).toBe(false);
  });
  it("ignores mixed-level runs and keeps only the five most recent scores", () => {
    const many = Array.from({ length: 8 }, (_, i) => a("easy", 10 * (i + 1), `2026-01-0${i + 1}`));
    const rows = summarizeLevels([...many, a(null, 100, "2026-02-01")], avail, 70);
    expect(rows[0]!.attempts).toBe(8);
    expect(rows[0]!.recent).toEqual([80, 70, 60, 50, 40]);
    expect(rows.every((r) => r.bestPct !== 100)).toBe(true);
  });
  it("treats a level missing from the counts as empty", () => {
    expect(summarizeLevels([], { easy: 1 } as never, 70)[2]!.available).toBe(0);
  });
});

describe("recommendedLevel", () => {
  const rows = (cleared: [boolean, boolean, boolean], counts = avail) => summarizeLevels(cleared.flatMap((c, i) => (c ? [a((["easy", "medium", "hard"] as const)[i]!, 90, "2026-01-01")] : [])), counts, 70);
  it("starts at easy, then climbs as levels are cleared", () => {
    expect(recommendedLevel(rows([false, false, false]))).toBe("easy");
    expect(recommendedLevel(rows([true, false, false]))).toBe("medium");
    expect(recommendedLevel(rows([true, true, false]))).toBe("hard");
  });
  it("keeps recommending hard once everything is cleared", () => {
    expect(recommendedLevel(rows([true, true, true]))).toBe("hard");
  });
  it("skips levels that have no questions and returns null when the bank is empty", () => {
    expect(recommendedLevel(rows([false, false, false], { easy: 0, medium: 5, hard: 5 }))).toBe("medium");
    expect(recommendedLevel(rows([false, false, false], { easy: 0, medium: 0, hard: 0 }))).toBeNull();
  });
});

describe("countByLevel", () => {
  it("counts per level and ignores unrated questions", () => {
    expect(countByLevel([{ difficulty: "easy" }, { difficulty: "easy" }, { difficulty: "hard" }, {}, { difficulty: undefined }])).toEqual({ easy: 2, medium: 0, hard: 1 });
    expect(countByLevel([])).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});
