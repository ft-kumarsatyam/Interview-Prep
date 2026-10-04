import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { interviewQuestions, interviewTracks } from "@/core/content";
import { resetEnvForTests } from "@/core/env";
import { GeneratedInterviewDoc, WebInterviewProgress } from "@/core/models/webdev";
import { Settings } from "@/core/models/system";
import { generateInterviewQuestions, isGeneratedInterviewQuestion, loadGeneratedInterview } from "@/modules/learn/services/interview-generated";
import { getInterviewStatus, setInterviewStatus } from "@/modules/learn/services/webdev";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await Promise.all([GeneratedInterviewDoc.syncIndexes(), WebInterviewProgress.syncIndexes()]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  resetEnvForTests();
});

const TRACK = interviewTracks[0]!.id;
const ANSWER = `**Pick the approach that matches the access pattern, then prove it with a measurement.**\n\n${"The reasoning is that each choice trades memory, latency and operational cost differently, so the right answer depends on the read and write mix you actually observe in production. ".repeat(3)}`;
const mk = (q: string) => ({ q, answer: ANSWER, followUps: ["How would you measure that?", "What changes at ten times the load?"], mistakes: ["Optimising before measuring"] });
const QS = ["Why would you choose a queue over a synchronous call between two services?", "What happens to in flight requests when a node leaves a hash ring?", "How do you decide between optimistic and pessimistic locking here?"].map(mk);
const gemini = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const useKey = () => {
  process.env.GEMINI_API_KEY = "gem-key-1234567";
  resetEnvForTests();
};

describe("generateInterviewQuestions", () => {
  it("stores valid new questions for the track and loads them in the bank's shape", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: QS })));
    expect(await generateInterviewQuestions(TRACK, "senior")).toMatchObject({ ok: true, added: 3 });
    const loaded = await loadGeneratedInterview(TRACK);
    expect(loaded).toHaveLength(3);
    expect(loaded[0]).toMatchObject({ track: TRACK, level: "senior", followUps: expect.any(Array), mistakes: expect.any(Array) });
    expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(loaded[0]!.id)).toBe(true);
    expect(await loadGeneratedInterview("some-other-track")).toEqual([]);
  });

  it("skips a question the hand-written bank already has, and a repeat batch adds nothing", async () => {
    useKey();
    const existing = interviewQuestions.find((q) => q.track === TRACK)!.q;
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: [mk(existing), ...QS.slice(0, 1)] })));
    expect(await generateInterviewQuestions(TRACK, "mid")).toMatchObject({ ok: true, added: 1, skippedDuplicates: 1 });
    expect(await generateInterviewQuestions(TRACK, "mid")).toMatchObject({ ok: false, error: expect.stringContaining("repeats") });
    expect(await GeneratedInterviewDoc.countDocuments({})).toBe(1);
  });

  it("refuses an unknown track, reports a missing key and a failing model, and stores nothing", async () => {
    expect(await generateInterviewQuestions("no-such-track", "mid")).toMatchObject({ ok: false, error: expect.stringContaining("track") });
    expect((await generateInterviewQuestions(TRACK, "mid")).ok).toBe(false);
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    expect((await generateInterviewQuestions(TRACK, "mid")).ok).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: [{ q: "bad" }] })));
    expect((await generateInterviewQuestions(TRACK, "mid")).ok).toBe(false);
    expect(await GeneratedInterviewDoc.countDocuments({})).toBe(0);
  });

  it("is rate limited", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: [{ q: "bad" }] })));
    for (let i = 0; i < 10; i++) await generateInterviewQuestions(TRACK, "mid");
    expect(await generateInterviewQuestions(TRACK, "mid")).toMatchObject({ ok: false, error: expect.stringContaining("recently") });
  });
});

describe("rating generated questions", () => {
  it("accepts a generated id, tracks it like any other, and still rejects unknown ids", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: QS })));
    await generateInterviewQuestions(TRACK, "mid");
    const id = (await loadGeneratedInterview(TRACK))[0]!.id;
    expect(await isGeneratedInterviewQuestion(id)).toBe(true);
    await setInterviewStatus(id, "review", "2026-10-05");
    expect((await getInterviewStatus()).get(id)).toBe("review");
    await setInterviewStatus(id, "new", "2026-10-05");
    expect((await getInterviewStatus()).has(id)).toBe(false);
    await expect(setInterviewStatus("made-up-id", "known", "2026-10-05")).rejects.toThrow("Unknown question");
    expect(await isGeneratedInterviewQuestion("made-up-id")).toBe(false);
  });
});
