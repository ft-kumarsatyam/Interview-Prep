import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { roadmapById } from "@/core/roadmaps";
import { DayLog } from "@/core/models/day";
import { PracticeAttempt } from "@/core/models/learning";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { Settings } from "@/core/models/system";
import { exportBackup } from "@/core/services/export";
import { setCourseLessonDone } from "@/modules/course/services/progress";
import { getRoadmapState, joinRoadmap, leaveRoadmap, listRoadmaps, setChecklistItem, setLinkRead, setNodeManual } from "@/modules/roadmap/services/roadmap";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const R = roadmapById.get("dsa")!;
const node = (id: string) => R.sections.flatMap((s) => s.nodes).find((n) => n.id === id)!;
const tickAll = async (id: string) => {
  for (const i of node(id).checklist.keys()) await setChecklistItem("dsa", id, i, true);
};

describe("joining", () => {
  it("joins once, leaves, and keeps node progress", async () => {
    await joinRoadmap("dsa", "2026-10-05");
    await joinRoadmap("dsa", "2026-10-09");
    expect((await getRoadmapState(R)).joinedOn).toBe("2026-10-05");
    await setNodeManual("dsa", "big-o", true, "2026-10-06");
    await leaveRoadmap("dsa");
    const state = await getRoadmapState(R);
    expect(state.joinedOn).toBeNull();
    expect(state.statuses.get("big-o")?.manual).toBe(true);
    await expect(joinRoadmap("nope", "2026-10-05")).rejects.toThrow(/Unknown roadmap/);
    expect((await listRoadmaps()).length).toBeGreaterThan(0);
  });
});

describe("auto-tick from reading, practice and quiz", () => {
  it("ticks a node only when its lesson, problems and quiz are all done", async () => {
    const n = node("arrays"); // lesson dsa/arrays, links, problems, a quiz and a checklist
    expect((await getRoadmapState(R)).statuses.get("arrays")?.done).toBe(false);

    await setCourseLessonDone("dsa", "arrays", true, "2026-10-05");
    for (const l of n.links) await setLinkRead("dsa", "arrays", l.url, true);
    for (const slug of n.problems) await ProblemProgress.create({ slug, status: "solved", firstSolvedOn: "2026-10-05", lastSolvedOn: "2026-10-05" });
    let st = (await getRoadmapState(R)).statuses.get("arrays")!;
    expect(st.reading).toBe(true);
    expect(st.practice).toBe(true);
    expect(st.quiz).toBe(false);
    expect(st.done).toBe(false);

    // a failing attempt does not count, an unsubmitted one neither
    await PracticeAttempt.create({ scope: "subtopic", ref: n.quiz!, pct: 20, submittedAt: new Date() });
    await PracticeAttempt.create({ scope: "subtopic", ref: n.quiz!, pct: 100, submittedAt: null });
    expect((await getRoadmapState(R)).statuses.get("arrays")?.quiz).toBe(false);

    await PracticeAttempt.create({ scope: "subtopic", ref: n.quiz!, pct: 90, submittedAt: new Date() });
    st = (await getRoadmapState(R)).statuses.get("arrays")!;
    expect(st.quiz).toBe(true);
    await tickAll("arrays");
    st = (await getRoadmapState(R)).statuses.get("arrays")!;
    expect(st.done).toBe(true);
    expect((await getRoadmapState(R)).progress.must.done).toBe(1);
  });

  it("counts a link as read only when it is one of the node's links", async () => {
    const link = node("visualise").links[0]!;
    await setLinkRead("dsa", "visualise", link.url, true);
    await expect(setLinkRead("dsa", "visualise", "https://evil.example/x", true)).rejects.toThrow(/Unknown link/);
    expect((await getRoadmapState(R)).readLinks.get("visualise")).toEqual([link.url]);
    // visualise has two or more links: one read is not enough
    expect((await getRoadmapState(R)).statuses.get("visualise")?.reading).toBe(false);
    for (const l of node("visualise").links) await setLinkRead("dsa", "visualise", l.url, true);
    expect((await getRoadmapState(R)).statuses.get("visualise")?.reading).toBe(true);
    await setLinkRead("dsa", "visualise", link.url, false);
    expect((await getRoadmapState(R)).statuses.get("visualise")?.reading).toBe(false);
  });

  it("ticks checklist topics one by one and rejects unknown ones", async () => {
    const n = node("arrays");
    expect(n.checklist.length).toBeGreaterThan(1);
    await setChecklistItem("dsa", "arrays", 0, true);
    await setChecklistItem("dsa", "arrays", 0, true);
    let st = await getRoadmapState(R);
    expect(st.checked.get("arrays")).toEqual([0]);
    expect(st.statuses.get("arrays")?.topics).toEqual({ done: 1, total: n.checklist.length });
    await expect(setChecklistItem("dsa", "arrays", n.checklist.length, true)).rejects.toThrow(/Unknown topic/);
    await setChecklistItem("dsa", "arrays", 0, false);
    st = await getRoadmapState(R);
    expect(st.statuses.get("arrays")?.topics.done).toBe(0);
  });

  it("never touches the plan, the streak or the day log, and is part of the backup", async () => {
    await joinRoadmap("dsa", "2026-10-05");
    await setNodeManual("dsa", "big-o", true, "2026-10-05");
    await setCourseLessonDone("dsa", "arrays", true, "2026-10-05");
    expect(await SubtopicProgress.countDocuments()).toBe(0);
    expect(await DayLog.countDocuments()).toBe(0);
    const backup = await exportBackup();
    expect(backup.collections.roadmapenrollments).toHaveLength(1);
    expect(backup.collections.roadmapnodeprogress).toHaveLength(1);
    expect(backup.collections.courselessonprogress).toHaveLength(1);
  });
});
