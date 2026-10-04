import { describe, expect, it } from "vitest";
import { AGGREGATOR_MIN_INTERVAL_MIN, BOARD_MIN_INTERVAL_MIN, dueSources, healthLabel, MAX_COOLDOWN_HOURS, nextHealth, selectPostings, type SourceState } from "@/lib/domain/job-sync";
import type { NormalizedPosting } from "@/lib/domain/job-postings";

const NOW = new Date("2026-10-05T12:00:00Z");
const min = (m: number) => new Date(NOW.getTime() - m * 60_000);
const src = (id: string, over: Partial<SourceState> = {}): SourceState => ({ id, kind: "board", enabled: true, lastTriedAt: null, cooldownUntil: null, consecutiveFailures: 0, ...over });

describe("dueSources", () => {
  it("rotates: never-tried first, then least recently tried, skipping off, cooling and recent ones", () => {
    const due = dueSources(
      [
        src("recent", { lastTriedAt: min(10) }),
        src("old", { lastTriedAt: min(BOARD_MIN_INTERVAL_MIN + 500) }),
        src("older", { lastTriedAt: min(BOARD_MIN_INTERVAL_MIN + 900) }),
        src("never"),
        src("off", { enabled: false }),
        src("cooling", { cooldownUntil: new Date(NOW.getTime() + 60_000) }),
        src("cooled", { cooldownUntil: min(1), lastTriedAt: min(BOARD_MIN_INTERVAL_MIN + 1) }),
      ],
      NOW,
    );
    expect(due.map((s) => s.id)).toEqual(["never", "older", "old", "cooled"]);
  });
  it("makes aggregators wait longer than boards", () => {
    const tried = min(BOARD_MIN_INTERVAL_MIN + 5);
    expect(dueSources([src("b", { lastTriedAt: tried }), src("a", { kind: "aggregator", lastTriedAt: tried })], NOW).map((s) => s.id)).toEqual(["b"]);
    expect(dueSources([src("a", { kind: "aggregator", lastTriedAt: min(AGGREGATOR_MIN_INTERVAL_MIN + 1) })], NOW)).toHaveLength(1);
  });
});

describe("nextHealth", () => {
  it("doubles the pause per failure up to a day, and a success resets everything", () => {
    let h = { consecutiveFailures: 0, cooldownUntil: null as Date | null, lastError: "" };
    const pauses: number[] = [];
    for (let i = 0; i < 9; i++) {
      h = nextHealth(h, { ok: false, error: "HTTP 500" }, NOW);
      pauses.push((h.cooldownUntil!.getTime() - NOW.getTime()) / 3_600_000);
    }
    expect(pauses.slice(0, 4)).toEqual([0.5, 1, 2, 4]);
    expect(Math.max(...pauses)).toBe(MAX_COOLDOWN_HOURS);
    expect(nextHealth(h, { ok: true }, NOW)).toEqual({ consecutiveFailures: 0, cooldownUntil: null, lastError: "" });
  });
  it("keeps error text short", () => {
    expect(nextHealth({ consecutiveFailures: 0 }, { ok: false, error: "x".repeat(900) }, NOW).lastError).toHaveLength(300);
  });
});

const post = (id: string, title: string, postedAt: string | null): NormalizedPosting => ({ source: "greenhouse", sourceId: "x", externalId: id, title, company: "X", location: "", remote: null, department: "", postedAt, url: "https://x.example/1", applyUrl: "https://x.example/1", jd: "", tags: [] });

describe("selectPostings", () => {
  it("keeps engineering roles, newest first, within the cap", () => {
    const out = selectPostings([post("1", "Software Engineer", "2026-09-01T00:00:00Z"), post("2", "Account Executive", "2026-10-01T00:00:00Z"), post("3", "Backend Developer", "2026-10-03T00:00:00Z"), post("4", "Data Engineer", null)], 2);
    expect(out.map((p) => p.externalId)).toEqual(["3", "1"]);
  });
});

describe("healthLabel", () => {
  it("summarises a source for the Sources tab", () => {
    const base = { ...src("a"), lastOkAt: min(60) };
    expect(healthLabel(base, NOW)).toBe("ok");
    expect(healthLabel({ ...base, lastOkAt: min(60 * 24 * 4) }, NOW)).toBe("stale");
    expect(healthLabel({ ...base, lastOkAt: null }, NOW)).toBe("never run");
    expect(healthLabel({ ...base, enabled: false }, NOW)).toBe("off");
    expect(healthLabel({ ...base, cooldownUntil: new Date(NOW.getTime() + 1000) }, NOW)).toBe("cooling down");
  });
});
