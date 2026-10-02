import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { designCaseBySlug } from "@/lib/content";
import { Design, Mastery } from "@/lib/models/learning";
import { SubtopicProgress } from "@/lib/models/progress";
import { Article, Settings } from "@/lib/models/system";
import {
  addDesignMinutes,
  getDesign,
  getDesignOverview,
  relatedArticlesForCase,
  saveDesignSection,
  setDesignRubric,
} from "@/lib/services/designs";
import { exportBackup } from "@/lib/services/export";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const words = (n: number) => Array(n).fill("shard").join(" ");
const slug = "url-shortener";

describe("design answers", () => {
  it("returns empty sections for an untouched case", async () => {
    const d = await getDesign(slug);
    expect(d.minutesSpent).toBe(0);
    expect(d.rubric).toEqual([]);
    expect(Object.values(d.sections).every((s) => s === "")).toBe(true);
    expect(await Design.countDocuments()).toBe(0);
  });

  it("saves sections independently, filters the rubric and accumulates minutes", async () => {
    await saveDesignSection(slug, "api", "POST /urls");
    await saveDesignSection(slug, "requirements", "shorten and redirect");
    await setDesignRubric(slug, ["scope", "scope", "made-up", "numbers"]);
    expect(await addDesignMinutes(slug, 10)).toBe(10);
    expect(await addDesignMinutes(slug, 5)).toBe(15);

    const d = await getDesign(slug);
    expect(d.sections.api).toBe("POST /urls");
    expect(d.sections.requirements).toBe("shorten and redirect");
    expect(d.rubric).toEqual(["scope", "numbers"]);
    expect(d.minutesSpent).toBe(15);
    expect(await Design.countDocuments()).toBe(1);
  });

  it("rejects unknown cases", async () => {
    await expect(getDesign("nope")).rejects.toThrow(/Unknown design case/);
    await expect(saveDesignSection("nope", "api", "x")).rejects.toThrow();
  });
});

describe("getDesignOverview", () => {
  it("derives status from progress, mastery and answers", async () => {
    const c = designCaseBySlug.get(slug)!;
    const crawler = designCaseBySlug.get("web-crawler")!;
    const feed = designCaseBySlug.get("news-feed")!;

    await SubtopicProgress.create({ subtopicId: c.practiceRef, topicId: c.topicId, doneOn: "2026-10-01" });
    await Mastery.create({ ref: crawler.topicId, scope: "topic", masteredOn: "2026-10-01" });
    for (const id of ["requirements", "estimates", "api", "dataModel", "architecture", "deepDives"] as const) {
      await saveDesignSection(feed.slug, id, words(20));
    }
    await setDesignRubric(feed.slug, ["scope", "numbers", "api", "data", "e2e"]);
    await addDesignMinutes(feed.slug, 40);

    const o = await getDesignOverview();
    expect(Object.keys(o)).toHaveLength(17);
    expect(o[slug]).toMatchObject({ status: "studying", subtopicsDone: 1 });
    expect(o["web-crawler"].status).toBe("mastered");
    expect(o["file-sync"].status).toBe("mastered");
    expect(o["news-feed"]).toMatchObject({ status: "practised", sectionsAttempted: 6, rubricPct: 50, minutesSpent: 40 });
    expect(o.chat.status).toBe("new");
    expect(o.leaderboard).toMatchObject({ status: "new", subtopicsDone: 0, minutesSpent: 0 });
  });
});

describe("relatedArticlesForCase", () => {
  it("matches case keywords in recent article titles", async () => {
    const now = new Date();
    const base = { sourceId: "s", sourceName: "S", snippet: "", fetchedAt: now, publishedAt: now };
    await Article.create([
      { ...base, url: "https://a.dev/1", urlHash: "1", title: "How we built our URL shortener", category: "engineering" },
      { ...base, url: "https://a.dev/2", urlHash: "2", title: "Kubernetes upgrade notes", category: "engineering" },
      { ...base, url: "https://a.dev/3", urlHash: "3", title: "URL shortener in AI news", category: "ai-news" },
    ]);
    const out = await relatedArticlesForCase(designCaseBySlug.get(slug)!);
    expect(out.map((a) => a.title)).toEqual(["How we built our URL shortener"]);
  });
});

describe("export", () => {
  it("includes design answers and strips article bodies", async () => {
    await saveDesignSection(slug, "api", "GET /:code");
    await Article.create({
      url: "https://a.dev/x",
      urlHash: "x",
      title: "t",
      sourceId: "s",
      sourceName: "S",
      category: "engineering",
      fetchedAt: new Date(),
      read: true,
      content: "long body",
    });
    const backup = await exportBackup();
    expect(backup.collections.designs).toHaveLength(1);
    expect(backup.collections.designs[0].sections?.api).toBe("GET /:code");
    expect(backup.collections.articles).toHaveLength(1);
    expect("content" in backup.collections.articles[0]).toBe(false);
  });
});
