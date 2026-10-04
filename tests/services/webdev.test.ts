import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { interviewQuestions, webProjects } from "@/lib/content";
import { WebInterviewProgress, WebLessonProgress } from "@/lib/models/webdev";
import { Settings } from "@/lib/models/system";
import { exportBackup } from "@/lib/services/export";
import { getBaseResume, saveBaseResume } from "@/lib/services/resume";
import { invalidateSettings } from "@/lib/services/settings";
import { addProjectToSavedResume, getDoneLessons, getInterviewStatus, getProjectState, saveProjectMeta, setInterviewStatus, setLessonDone, setMilestone } from "@/lib/services/webdev";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const P = webProjects[0]!;

describe("lessons", () => {
  it("marks done once, keeps the best score and the first date, and can undo", async () => {
    await setLessonDone("react-rendering", true, "2026-10-05", 67);
    await setLessonDone("react-rendering", true, "2026-10-09", 33);
    expect((await getDoneLessons()).get("react-rendering")).toEqual({ doneOn: "2026-10-05", bestScore: 67 });
    await setLessonDone("react-rendering", true, "2026-10-10", 100);
    expect((await getDoneLessons()).get("react-rendering")!.bestScore).toBe(100);
    await setLessonDone("react-rendering", false, "2026-10-10");
    expect((await getDoneLessons()).size).toBe(0);
    await expect(setLessonDone("nope", true, "2026-10-05")).rejects.toThrow(/Unknown lesson/);
  });

  it("never touches the study plan's own progress collections", async () => {
    await setLessonDone("react-rendering", true, "2026-10-05");
    const backup = await exportBackup();
    expect(backup.collections.weblessonprogress).toHaveLength(1);
    expect(backup.collections.subtopicprogress).toHaveLength(0);
    expect(await WebLessonProgress.countDocuments()).toBe(1);
  });
});

describe("interview practice", () => {
  it("rates a question, counts attempts, resets to new and backs it up", async () => {
    const qid = interviewQuestions[0]!.id;
    await setInterviewStatus(qid, "review", "2026-10-05");
    await setInterviewStatus(qid, "known", "2026-10-06");
    expect((await getInterviewStatus()).get(qid)).toBe("known");
    expect(await WebInterviewProgress.findOne({ qid }).lean()).toMatchObject({ status: "known", updatedOn: "2026-10-06", attempts: 2 });
    expect((await exportBackup()).collections.webinterviewprogress).toHaveLength(1);
    await setInterviewStatus(qid, "new", "2026-10-07");
    expect((await getInterviewStatus()).size).toBe(0);
    await expect(setInterviewStatus("nope", "known", "2026-10-07")).rejects.toThrow(/Unknown question/);
  });
});

describe("projects", () => {
  it("starts on the first tick, finishes when every milestone is ticked, and reopens when one is unticked", async () => {
    const ids = P.milestones.map((m) => m.id);
    let s = await setMilestone(P.slug, ids[0]!, true, "2026-10-05");
    expect(s).toMatchObject({ startedOn: "2026-10-05", milestones: [ids[0]], doneOn: null });
    for (const id of ids.slice(1)) s = await setMilestone(P.slug, id, true, "2026-10-08");
    expect(s.doneOn).toBe("2026-10-08");
    s = await setMilestone(P.slug, ids[2]!, false, "2026-10-09");
    expect(s.doneOn).toBeNull();
    expect(s.milestones).not.toContain(ids[2]);
    await expect(setMilestone(P.slug, "m99", true, "2026-10-09")).rejects.toThrow(/Unknown milestone/);
    await expect(setMilestone("nope", "m1", true, "2026-10-09")).rejects.toThrow(/Unknown project/);
  });

  it("saves repo and notes without losing progress", async () => {
    await setMilestone(P.slug, "m1", true, "2026-10-05");
    await saveProjectMeta(P.slug, { repoUrl: "https://github.com/me/x", notes: "n" }, "2026-10-06");
    expect(await getProjectState(P.slug)).toMatchObject({ repoUrl: "https://github.com/me/x", notes: "n", milestones: ["m1"], startedOn: "2026-10-05" });
  });

  it("adds the project's bullets to the saved resume once", async () => {
    await expect(addProjectToSavedResume(P.slug)).rejects.toThrow(/Save your resume/);
    await saveBaseResume("Aarav\naarav@example.com\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built things with Node.js for 2M users\nSKILLS\nNode.js");
    expect(await addProjectToSavedResume(P.slug)).toEqual({ added: true });
    const text = (await getBaseResume())!.text;
    expect(text).toContain("PROJECTS");
    expect(text).toContain(P.title);
    expect(text).toMatch(/\[X\]|\[[^\]]+\]/);
    expect(await addProjectToSavedResume(P.slug)).toEqual({ added: false });
    expect(((await getBaseResume())!.text.match(new RegExp(P.title, "g")) ?? []).length).toBe(1);
  });
});
