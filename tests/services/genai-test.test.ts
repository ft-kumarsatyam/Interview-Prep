import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DayLog } from "@/core/models/day";
import { GenaiTestAttempt } from "@/core/models/genai-test";
import { RoadmapNodeProgress } from "@/core/models/roadmap";
import { Settings } from "@/core/models/system";
import { getHomeView, getResultView, getTakeView, saveDraft, selfGrade, startAttempt, submitAttempt } from "@/modules/genai-test/services/test";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  delete process.env.GEMINI_API_KEYS;
  delete process.env.GEMINI_API_KEY;
});

const WEEK5 = "2026-11-23";

describe("GenAI tests", () => {
  it("starts a weekly test without leaking the answer key", async () => {
    const res = await startAttempt({ kind: "weekly" }, WEEK5);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const view = await getTakeView(res.id);
    expect(view?.weekId).toBe("w05");
    expect(view?.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(/"answer"|"why"|"reference"|"points"/);
    expect(await getResultView(res.id)).toBeUndefined();
    const again = await startAttempt({ kind: "weekly" }, WEEK5);
    expect(again.ok && again.id).toBe(res.id);
  });

  it("scores MCQs on submit, leaves written answers for self-grading with no AI, and then totals them", async () => {
    const start = await startAttempt({ kind: "weekly" }, WEEK5);
    if (!start.ok) throw new Error("no test");
    const doc = await GenaiTestAttempt.findById(start.id).lean();
    const qs = (doc!.questions as { q: { id: string; kind: string; answer?: number } }[]).map((p) => p.q);
    const raw: Record<string, number | string> = {};
    for (const q of qs) raw[q.id] = q.kind === "mcq" ? (q.answer as number) : "A thorough answer covering the key points and a trade-off.";
    expect((await saveDraft(start.id, raw)).ok).toBe(true);
    const sub = await submitAttempt(start.id, raw, WEEK5);
    expect(sub).toMatchObject({ ok: true, aiUnavailable: true });
    let result = await getResultView(start.id);
    expect(result?.mcqCorrect).toBe(result?.mcqTotal);
    const writtenIds = qs.filter((q) => q.kind === "written").map((q) => q.id);
    expect(result?.pendingWritten).toBe(writtenIds.length);
    expect(result?.pct).toBeNull();
    for (const qid of writtenIds) expect((await selfGrade(start.id, qid, { accuracy: 4, completeness: 4, reasoning: 4, clarity: 4 })).ok).toBe(true);
    result = await getResultView(start.id);
    expect(result?.pct).toBe(100);
    expect(result?.passed).toBe(true);
    expect(await getTakeView(start.id)).toBeUndefined();
    expect((await submitAttempt(start.id, raw, WEEK5)).ok).toBe(false);
  });

  it("rejects out-of-range options and never touches the streak", async () => {
    const start = await startAttempt({ kind: "weekly" }, WEEK5);
    if (!start.ok) throw new Error("no test");
    const doc = await GenaiTestAttempt.findById(start.id).lean();
    const first = (doc!.questions as { q: { id: string; kind: string } }[]).find((p) => p.q.kind === "mcq")!.q.id;
    await saveDraft(start.id, { [first]: 9, nope: 1 });
    expect((await getTakeView(start.id))?.answers).toEqual({});
    await submitAttempt(start.id, {}, WEEK5);
    expect(await DayLog.countDocuments()).toBe(0);
  });

  it("reports the home view with coverage that follows roadmap ticks", async () => {
    const before = await getHomeView(WEEK5);
    expect(before.weekId).toBe("w05");
    expect(before.expected.covered).toBe(0);
    expect(before.expected.expected).toBeGreaterThan(0);
    await RoadmapNodeProgress.create({ roadmapId: "genai-16-levels", nodeId: "m1-1", checked: [0, 1], manualDoneOn: null });
    const after = await getHomeView(WEEK5);
    expect(after.expected.covered).toBe(2);
    expect(after.levels.find((l) => l.level === 1)?.coverage.covered).toBe(2);
  });

  it("starts level and cumulative tests and refuses an unknown level", async () => {
    expect((await startAttempt({ kind: "level", level: 99 }, WEEK5)).ok).toBe(false);
    expect((await startAttempt({ kind: "cumulative" }, "2027-03-20")).ok).toBe(true);
  });
});
