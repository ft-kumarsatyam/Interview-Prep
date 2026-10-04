import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { practiceCases } from "@/core/content";
import { Mastery } from "@/core/models/learning";
import { SubtopicProgress } from "@/core/models/progress";
import { Settings } from "@/core/models/system";
import { exportBackup } from "@/core/services/export";
import { addPracticeMinutes, getPracticeAnswer, getPracticeOverview, savePracticeSection, setPracticeRubric } from "@/modules/design/services/practice-cases";
import { PracticeAnswer } from "@/core/models/learning";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const words = (n: number) => Array(n).fill("page").join(" ");
const osCase = practiceCases.find((c) => c.kind === "os")!;
const dbmsCase = practiceCases.find((c) => c.kind === "dbms")!;

describe("practice answers", () => {
  it("returns empty sections for an untouched case without writing anything", async () => {
    const a = await getPracticeAnswer("os", osCase.slug);
    expect(a.minutesSpent).toBe(0);
    expect(a.rubric).toEqual([]);
    expect(Object.values(a.sections).every((s) => s === "")).toBe(true);
    expect(await PracticeAnswer.countDocuments()).toBe(0);
  });

  it("saves sections independently, filters the rubric and accumulates minutes", async () => {
    await savePracticeSection("os", osCase.slug, "definition", "A page is a fixed-size block");
    await savePracticeSection("os", osCase.slug, "example", "4 KiB pages, 12 offset bits");
    await setPracticeRubric("os", osCase.slug, ["definition", "definition", "made-up", "example"]);
    expect(await addPracticeMinutes("os", osCase.slug, 10)).toBe(10);
    expect(await addPracticeMinutes("os", osCase.slug, 5)).toBe(15);

    const a = await getPracticeAnswer("os", osCase.slug);
    expect(a.sections.definition).toBe("A page is a fixed-size block");
    expect(a.sections.example).toBe("4 KiB pages, 12 offset bits");
    expect(a.sections.tradeoffs).toBe("");
    expect(a.rubric).toEqual(["definition", "example"]);
    expect(a.minutesSpent).toBe(15);
    expect(await PracticeAnswer.countDocuments()).toBe(1);
  });

  it("keeps os and dbms answers apart", async () => {
    await savePracticeSection("os", osCase.slug, "definition", "os text");
    await savePracticeSection("dbms", dbmsCase.slug, "definition", "dbms text");
    expect((await getPracticeAnswer("os", osCase.slug)).sections.definition).toBe("os text");
    expect((await getPracticeAnswer("dbms", dbmsCase.slug)).sections.definition).toBe("dbms text");
    expect(await PracticeAnswer.countDocuments()).toBe(2);
  });

  it("rejects unknown cases and a case under the wrong kind", async () => {
    await expect(getPracticeAnswer("os", "nope")).rejects.toThrow(/Unknown os practice case/);
    await expect(savePracticeSection("dbms", osCase.slug, "definition", "x")).rejects.toThrow();
  });
});

describe("getPracticeOverview", () => {
  it("derives status from progress, mastery and answers, scoped to one kind", async () => {
    const other = practiceCases.find((c) => c.kind === "os" && c.topicId !== osCase.topicId);
    expect((await getPracticeOverview("os"))[osCase.slug]!.status).toBe("new");

    await SubtopicProgress.create({ subtopicId: osCase.practiceRef, topicId: osCase.topicId, doneOn: "2026-10-05" });
    expect((await getPracticeOverview("os"))[osCase.slug]!.status).toBe("studying");

    for (const id of ["definition", "example", "tradeoffs", "realSystems", "followups"] as const) {
      await savePracticeSection("os", osCase.slug, id, words(20));
    }
    await setPracticeRubric("os", osCase.slug, ["definition", "example", "tradeoffs"]);
    const practised = (await getPracticeOverview("os"))[osCase.slug]!;
    expect(practised.status).toBe("practised");
    expect(practised.sectionsAttempted).toBe(5);
    expect(practised.rubricPct).toBe(60);

    await Mastery.create({ ref: osCase.topicId, scope: "topic", masteredOn: "2026-10-06" });
    expect((await getPracticeOverview("os"))[osCase.slug]!.status).toBe("mastered");
    if (other) expect((await getPracticeOverview("os"))[other.slug]!.status).toBe("new");

    const dbmsOverview = await getPracticeOverview("dbms");
    expect(Object.keys(dbmsOverview).every((slug) => practiceCases.find((c) => c.slug === slug)?.kind === "dbms")).toBe(true);
  });
});

describe("backup export", () => {
  it("includes practice answers", async () => {
    await savePracticeSection("os", osCase.slug, "definition", "kept in backups");
    const backup = await exportBackup();
    expect(backup.collections.practiceanswers).toHaveLength(1);
  });
});
