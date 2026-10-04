import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DayLog, Quiz } from "@/core/models/day";
import { SubtopicProgress } from "@/core/models/progress";
import { Settings } from "@/core/models/system";
import { setCourseLessonDone } from "@/modules/course/services/progress";
import { ensureToday } from "@/modules/planner/services/plan";
import { confirmLessonSubtopic, getLessonSubtopic } from "@/modules/progress/services/lesson-confirm";
import { getOrCreateQuiz } from "@/modules/quiz/services/quiz";
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
const LESSON = ["dsa", "arrays"] as const; // practiceRef dsa-complexity:3
const SUB = "dsa-complexity:3";

describe("a finished lesson offers its subtopic, and only a confirmed tick counts for the plan", () => {
  it("knows which subtopic a lesson teaches and whether it is ticked", async () => {
    expect(await getLessonSubtopic(...LESSON)).toMatchObject({ id: SUB, done: false });
    expect(await getLessonSubtopic("dsa", "nope")).toBeNull();
  });

  it("reading a lesson alone does not tick the subtopic or touch the day", async () => {
    await ensureToday(at(DAY));
    await setCourseLessonDone(...LESSON, true, DAY);
    expect(await SubtopicProgress.countDocuments()).toBe(0);
    expect((await DayLog.findOne({ date: DAY }).lean())?.theoryDone ?? 0).toBe(0);
  });

  it("refuses to confirm before the lesson is finished or for a lesson with no subtopic", async () => {
    await expect(confirmLessonSubtopic(...LESSON, DAY)).rejects.toThrow(/Finish the lesson first/);
    await expect(confirmLessonSubtopic("dsa", "nope", DAY)).rejects.toThrow(/doesn't map/);
  });

  it("confirming ticks the subtopic through the normal path (day recounted), once, and never unticks", async () => {
    await ensureToday(at(DAY));
    await setCourseLessonDone(...LESSON, true, DAY);
    const first = await confirmLessonSubtopic(...LESSON, DAY);
    expect(first).toMatchObject({ subtopicId: SUB, already: false });
    expect(await SubtopicProgress.findOne({ subtopicId: SUB }).lean()).toMatchObject({ doneOn: DAY, topicId: "dsa-complexity" });
    expect((await DayLog.findOne({ date: DAY }).lean())?.theoryDone).toBe(1);
    const again = await confirmLessonSubtopic(...LESSON, DAY);
    expect(again.already).toBe(true);
    expect(await SubtopicProgress.countDocuments()).toBe(1);
    expect((await DayLog.findOne({ date: DAY }).lean())?.theoryDone).toBe(1);
  });

  it("the daily quiz still decides completion: a lesson plus a confirmed tick cannot complete the day alone", async () => {
    const state = await ensureToday(at(DAY));
    await setCourseLessonDone(...LESSON, true, DAY);
    await confirmLessonSubtopic(...LESSON, DAY);
    const log = await DayLog.findOne({ date: DAY }).lean();
    expect(state.day.complete).toBe(false);
    expect(log?.complete).toBe(false);
    expect(await Quiz.countDocuments({ date: DAY, passed: true })).toBe(0);
  });

  it("a lesson finished today feeds today's daily quiz with its subtopic", async () => {
    await ensureToday(at(DAY));
    await setCourseLessonDone(...LESSON, true, DAY);
    const quiz = await getOrCreateQuiz(DAY, "daily", null);
    expect(quiz.questions.some((q) => q.source?.ref === SUB)).toBe(true);
  });
});
