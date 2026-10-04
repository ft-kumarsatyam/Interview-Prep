import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { subtopicById } from "@/core/content";
import { DayLog } from "@/core/models/day";
import { Mastery, PracticeAttempt } from "@/core/models/learning";
import { Settings } from "@/core/models/system";
import { setCourseLessonDone } from "@/modules/course/services/progress";
import { bank } from "@/modules/quiz/lib/bank";
import { CUSTOM_SIZES, customPool, startCustomPractice, submitPractice } from "@/modules/quiz/services/practice";
import { toggleSubtopic } from "@/modules/progress/services/progress";
import { getStudied } from "@/modules/progress/services/studied";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const DAY = "2026-10-06";
const withBank = [...bank().bySubtopic].filter(([id, qs]) => subtopicById.has(id) && qs.length >= 6).map(([id]) => id);
const [A, B] = [withBank[0]!, withBank.find((id) => subtopicById.get(id)!.topicId !== subtopicById.get(withBank[0]!)!.topicId)!];

describe("customPool", () => {
  it("picked expands a topic to its subtopics and drops unknown ids; track takes the whole subject", () => {
    const topicId = subtopicById.get(A)!.topicId;
    const picked = customPool({ mode: "picked", refs: [topicId, "nope", A], size: 10 }, new Set());
    expect(picked).toContain(A);
    expect(new Set(picked).size).toBe(picked.length);
    expect(picked.every((id) => subtopicById.get(id)?.topicId === topicId)).toBe(true);
    const track = subtopicById.get(A)!.track;
    expect(customPool({ mode: "track", track, size: 10 }, new Set()).length).toBeGreaterThan(picked.length - 1);
    expect(customPool({ mode: "studied", size: 10 }, new Set(["x:1"]))).toEqual(["x:1"]);
  });
});

describe("what counts as studied", () => {
  it("ticked subtopics and finished course lessons, but reading alone never ticks the plan", async () => {
    expect((await getStudied()).subtopics.size).toBe(0);
    await toggleSubtopic(A, DAY);
    await setCourseLessonDone("dsa", "arrays", true, DAY); // practiceRef dsa-complexity:3
    const studied = await getStudied();
    expect(studied.subtopics.has(A)).toBe(true);
    expect(studied.subtopics.has("dsa-complexity:3")).toBe(true);
    expect(studied.viaLessonsOnly.has("dsa-complexity:3")).toBe(true);
    // the lesson did not tick the subtopic in the plan
    expect(await DayLog.findOne({ date: DAY }).then((d) => d?.theoryDone ?? 0)).toBe(1);
  });
});

describe("startCustomPractice", () => {
  it("refuses an empty study history, a bad size, an unknown subject and an empty pick", async () => {
    await expect(startCustomPractice({ mode: "studied", size: 10 })).rejects.toThrow(/Nothing studied yet/);
    await expect(startCustomPractice({ mode: "picked", refs: [A], size: 7 })).rejects.toThrow(/5, 10, 15 or 20/);
    await expect(startCustomPractice({ mode: "track", track: "nope", size: 10 })).rejects.toThrow(/Unknown subject/);
    await expect(startCustomPractice({ mode: "picked", refs: ["nope"], size: 10 })).rejects.toThrow(/at least one topic/);
    expect(CUSTOM_SIZES).toEqual([5, 10, 15, 20]);
  });

  it("studied mode draws only from topics you studied, and stores what it drew from", async () => {
    await toggleSubtopic(A, DAY);
    const run = await startCustomPractice({ mode: "studied", size: 5 }, at(DAY));
    expect(run.questions).toHaveLength(5);
    expect(run.target.scope).toBe("custom");
    const attempt = await PracticeAttempt.findById(run.attemptId).lean();
    expect(attempt?.scope).toBe("custom");
    expect(attempt?.refs).toEqual([A]);
    expect(attempt?.questions.every((q) => q.ref === A)).toBe(true);
  });

  it("picked mode spreads across the chosen topics", async () => {
    const run = await startCustomPractice({ mode: "picked", refs: [A, B], size: 10 }, at(DAY));
    const attempt = await PracticeAttempt.findById(run.attemptId).lean();
    expect(new Set(attempt!.questions.map((q) => q.ref))).toEqual(new Set([A, B]));
  });

  it("grades once, updates mastery per subtopic, and never touches the day or the streak", async () => {
    const run = await startCustomPractice({ mode: "picked", refs: [A, B], size: 10 }, at(DAY));
    const attempt = await PracticeAttempt.findById(run.attemptId).lean();
    const answers = attempt!.questions.map((q) => q.answerIndex); // all correct (single-answer questions carry answerIndex)
    const before = await DayLog.countDocuments();
    const res = await submitPractice(run.attemptId, answers, at(DAY));
    expect(res.mastery).toBeNull();
    expect(res.outcome.pct).toBeGreaterThan(0);
    expect((await Mastery.findOne({ ref: A }).lean())?.attempts).toBe(1);
    expect((await Mastery.findOne({ ref: B }).lean())?.attempts).toBe(1);
    expect(await DayLog.countDocuments()).toBe(before);
    await expect(submitPractice(run.attemptId, answers, at(DAY))).rejects.toThrow(/Already submitted/);
  });
});
