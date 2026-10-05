import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { subtopics } from "@/core/content";
import { resetEnvForTests } from "@/core/env";
import { GeneratedQuestionRow, PracticeAttempt } from "@/core/models/learning";
import { Settings } from "@/core/models/system";
import { correctAnswerKey } from "@/modules/quiz/domain/quiz";
import { bank } from "@/modules/quiz/lib/bank";
import { generateMoreQuestions, generationTarget, loadGenerated } from "@/modules/quiz/services/generated";
import { getLevelProgress } from "@/modules/quiz/services/levels";
import { startPractice, submitPractice } from "@/modules/quiz/services/practice";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await Promise.all([PracticeAttempt.syncIndexes(), GeneratedQuestionRow.syncIndexes()]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  resetEnvForTests();
});

/** A subtopic with plenty of questions at every level, so a 5-question run can be filled from one level. */
const SUB = subtopics.find((s) => {
  const qs = bank().bySubtopic.get(s.id) ?? [];
  return (["easy", "medium", "hard"] as const).every((l) => qs.filter((q) => q.difficulty === l).length >= 5);
})!;

const geminiJson = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const NEW_QS = [
  "Why does a write-ahead log make crash recovery possible after power loss?",
  "Which failure does a circuit breaker protect a caller from during a dependency outage?",
  "What does a consistent hashing ring minimise when a node joins the cluster?",
  "How does a token bucket allow short bursts while limiting the average rate?",
  "Which property makes an operation safe to retry without side effects occurring twice?",
].map((prompt) => ({ prompt, options: ["The first option", "The second option", "The third option", "The fourth option"], answerIndex: 2, explanation: "The third option is right because it matches the mechanism described." }));

async function solveAll(attemptId: string) {
  const a = await PracticeAttempt.findById(attemptId).lean();
  return submitPractice(attemptId, (a!.questions ?? []).map((q) => correctAnswerKey({ type: q.type ?? undefined, answerIndex: q.answerIndex, answerIndices: q.answerIndices ?? undefined })), new Date());
}

describe("levels on practice runs", () => {
  it("records the level a run started at and leaves mixed runs unlabeled", async () => {
    const hard = await startPractice(SUB.id, null, new Date(), { difficulty: "hard" });
    const mixed = await startPractice(SUB.id, null, new Date(), {});
    expect((await PracticeAttempt.findById(hard.attemptId).lean())?.level).toBe("hard");
    expect((await PracticeAttempt.findById(mixed.attemptId).lean())?.level).toBeNull();
  });

  it("builds the ladder from submitted runs, climbs when a level is cleared, and ignores unfinished runs", async () => {
    const before = await getLevelProgress(SUB.id);
    expect(before!.rows.map((r) => r.level)).toEqual(["easy", "medium", "hard"]);
    expect(before!.rows.every((r) => r.available >= 5 && r.attempts === 0)).toBe(true);
    expect(before!.recommended).toBe("easy");

    await startPractice(SUB.id, null, new Date(), { difficulty: "easy" }); // never submitted
    expect((await getLevelProgress(SUB.id))!.rows[0]!.attempts).toBe(0);

    const run = await startPractice(SUB.id, null, new Date(), { difficulty: "easy" });
    await solveAll(run.attemptId);
    const after = (await getLevelProgress(SUB.id))!;
    expect(after.rows[0]).toMatchObject({ attempts: 1, bestPct: 100, cleared: true });
    expect(after.rows[1]!.attempts).toBe(0);
    expect(after.recommended).toBe("medium");
  });

  it("a failed run counts as an attempt but does not clear the level", async () => {
    const run = await startPractice(SUB.id, null, new Date(), { difficulty: "medium" });
    const a = await PracticeAttempt.findById(run.attemptId).lean();
    await submitPractice(run.attemptId, (a!.questions ?? []).map((q) => (q.answerIndex + 1) % q.options.length), new Date());
    const row = (await getLevelProgress(SUB.id))!.rows[1]!;
    expect(row.attempts).toBe(1);
    expect(row.cleared).toBe(false);
  });

  it("has no ladder for mistakes or case runs", async () => {
    expect(await getLevelProgress("mistakes")).toBeNull();
    expect(await getLevelProgress("case:hld:url-shortener")).toBeNull();
  });
});

describe("generating more questions", () => {
  const useKey = () => {
    process.env.GEMINI_API_KEY = "gem-key-1234567";
    resetEnvForTests();
  };

  it("stores new questions, counts them in the ladder, and mixes them into practice", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ questions: NEW_QS })));
    const before = (await getLevelProgress(SUB.id))!.rows[2]!.available;
    const r = await generateMoreQuestions(SUB.id, "hard");
    expect(r).toMatchObject({ ok: true, added: 5, level: "hard" });
    expect((await getLevelProgress(SUB.id))!.rows[2]!.available).toBe(before + 5);
    const stored = await loadGenerated([SUB.id]);
    expect(stored).toHaveLength(5);
    expect(stored[0]).toMatchObject({ style: "llm", difficulty: "hard", source: { kind: "subtopic", ref: SUB.id } });
    expect(stored[0]!.id.startsWith("g-")).toBe(true);
  });

  it("skips questions it already has, so a repeat adds nothing", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ questions: NEW_QS })));
    await generateMoreQuestions(SUB.id, "hard");
    const again = await generateMoreQuestions(SUB.id, "hard");
    expect(again).toMatchObject({ ok: false, error: expect.stringContaining("repeats") });
    expect(await GeneratedQuestionRow.countDocuments({})).toBe(5);
  });

  it("drops malformed questions but keeps the good ones", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ questions: [NEW_QS[0], { prompt: "bad" }, { ...NEW_QS[1], answerIndex: 9 }] })));
    expect(await generateMoreQuestions(SUB.id, "medium")).toMatchObject({ ok: true, added: 1 });
  });

  it("reports a missing key, an unknown subtopic and a model failure without storing anything", async () => {
    expect(await generateMoreQuestions(SUB.id, "easy")).toMatchObject({ ok: false });
    expect(await generateMoreQuestions("nope:99", "easy")).toMatchObject({ ok: false, error: expect.stringContaining("subtopic") });
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    expect((await generateMoreQuestions(SUB.id, "easy")).ok).toBe(false);
    expect(await GeneratedQuestionRow.countDocuments({})).toBe(0);
  });

  it("is rate limited", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ questions: [{ prompt: "short" }] })));
    for (let i = 0; i < 12; i++) await generateMoreQuestions(SUB.id, "easy");
    expect(await generateMoreQuestions(SUB.id, "easy")).toMatchObject({ ok: false, error: expect.stringContaining("recently") });
  });

  it("chooses the subtopic of a topic that has the fewest questions at that level", async () => {
    const siblings = subtopics.filter((s) => s.topicId === SUB.topicId).map((s) => s.id);
    const pick = await generationTarget(siblings, "hard");
    expect(siblings).toContain(pick);
    const counts = siblings.map((id) => (bank().bySubtopic.get(id) ?? []).filter((q) => q.difficulty === "hard").length);
    expect(counts[siblings.indexOf(pick!)]).toBe(Math.min(...counts));
  });
});
