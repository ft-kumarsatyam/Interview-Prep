import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { interviewFiles } from "@/core/content";
import { Mastery } from "@/core/models/learning";
import { Settings } from "@/core/models/system";
import { WebInterviewProgress } from "@/core/models/webdev";
import { setCourseLessonDone } from "@/modules/course/services/progress";
import { filterCatalog, KINDS, SUBJECTS } from "@/modules/practice/domain/catalog";
import { getPracticeCatalog } from "@/modules/practice/services/catalog";
import { recordSolve, toggleSubtopic } from "@/modules/progress/services/progress";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const DAY = "2026-10-06";

describe("practice catalog", () => {
  it("covers every kind and several subjects beyond DSA, with nothing started on a fresh account", async () => {
    const { entries, studiedTopics } = await getPracticeCatalog();
    expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(KINDS));
    const subjects = new Set(entries.map((e) => e.subject));
    for (const s of ["dsa", "hld", "os", "dbms", "networking", "lld"] as const) expect(subjects.has(s), s).toBe(true);
    expect(SUBJECTS.length).toBeGreaterThan(subjects.size - 1);
    expect(studiedTopics.size).toBe(0);
    expect(entries.every((e) => e.status === "new")).toBe(true);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(entries.every((e) => e.href.startsWith("/"))).toBe(true);
  });

  it("reflects what you studied, mastered, solved and know", async () => {
    await toggleSubtopic("os-memory-management:0", DAY);
    await setCourseLessonDone("dsa", "binary-search", true, DAY); // practiceRef dsa-stack-search-sort:2
    await Mastery.create({ ref: "dsa-dp", scope: "topic", score: 90, attempts: 2, bestPct: 90, masteredOn: DAY });
    const slug = "two-sum";
    await recordSolve({ slug, date: DAY, source: "manual", details: { confidence: "ok" } });
    const web = interviewFiles[0]!;
    await WebInterviewProgress.create({ qid: web.questions[0]!.id, status: "known", updatedOn: DAY, attempts: 1 });

    const { entries, studiedTopics } = await getPracticeCatalog();
    const byId = (id: string) => entries.find((e) => e.id === id)!;
    expect(studiedTopics.has("os-memory-management")).toBe(true);
    expect(studiedTopics.has("dsa-stack-search-sort")).toBe(true); // through the lesson
    expect(byId("quiz:os-memory-management").status).toBe("started");
    expect(byId("quiz:dsa-dp").status).toBe("mastered");
    expect(byId("quiz:dsa-stack-search-sort").status).toBe("started");
    expect(byId(`flashcards:${web.track.id}`)).toMatchObject({ status: "started", done: 1 });
    expect(entries.filter((e) => e.kind === "code" && e.subject === "dsa").some((e) => e.done > 0)).toBe(true);

    const mine = filterCatalog(entries, { studiedOnly: true }, studiedTopics);
    expect(mine.map((e) => e.topicId).every((t) => t === undefined || studiedTopics.has(t))).toBe(true);
    expect(mine.length).toBeGreaterThan(0);
  });
});
