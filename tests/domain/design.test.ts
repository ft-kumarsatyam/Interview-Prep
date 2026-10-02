import { describe, expect, it } from "vitest";
import { DESIGN_CATEGORIES, designBlockById, subtopicById, systemDesign, topicById } from "@/lib/content";
import {
  DESIGN_SECTION_IDS,
  PRACTICE_MINUTES,
  articleRelevance,
  designStatus,
  formatClock,
  relatedArticles,
  rubricScore,
  sectionsAttempted,
} from "@/lib/domain/design";

const words = (n: number) => Array(n).fill("word").join(" ");

describe("rubricScore", () => {
  it("counts unique valid ids only", () => {
    expect(rubricScore(["a", "a", "b", "zzz"], ["a", "b", "c", "d"])).toEqual({ done: 2, total: 4, pct: 50 });
  });
  it("handles an empty rubric", () => {
    expect(rubricScore(["a"], [])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("sectionsAttempted", () => {
  it("needs the minimum word count per section", () => {
    expect(sectionsAttempted({ requirements: words(15), api: words(14), estimates: "   " })).toBe(1);
  });
  it("ignores unknown keys", () => {
    expect(sectionsAttempted({ ...Object.fromEntries(DESIGN_SECTION_IDS.map((id) => [id, words(20)])) })).toBe(6);
  });
});

describe("designStatus", () => {
  const base = { topicMastered: false, subtopicsDone: 0, sectionsAttempted: 0, rubricPct: 0 };
  it("is new with no activity", () => expect(designStatus(base)).toBe("new"));
  it("is studying after any subtopic or section", () => {
    expect(designStatus({ ...base, subtopicsDone: 1 })).toBe("studying");
    expect(designStatus({ ...base, sectionsAttempted: 3, rubricPct: 100 })).toBe("studying");
  });
  it("is practised with every section and half the rubric", () => {
    expect(designStatus({ ...base, sectionsAttempted: 6, rubricPct: 50 })).toBe("practised");
    expect(designStatus({ ...base, sectionsAttempted: 6, rubricPct: 40 })).toBe("studying");
  });
  it("mastery wins", () => expect(designStatus({ ...base, topicMastered: true })).toBe("mastered"));
});

describe("articleRelevance / relatedArticles", () => {
  const kws = ["rate limiter", "token bucket"];
  it("scores whole-word title hits and plural forms", () => {
    expect(articleRelevance({ title: "Building rate limiters at scale", tags: [] }, kws, [])).toBe(3);
    expect(articleRelevance({ title: "Accelerate limiterless", tags: [] }, kws, [])).toBe(0);
    expect(articleRelevance({ title: "x", tags: ["caching", "infra"] }, kws, ["infra", "caching"])).toBe(2);
  });
  it("escapes regex characters in keywords", () => {
    expect(() => articleRelevance({ title: "a", tags: [] }, ["(", "[x"], [])).not.toThrow();
  });
  it("drops weak matches and orders by score then date", () => {
    const a = (title: string, tags: string[], publishedAt: string | null) => ({ title, tags, publishedAt });
    const out = relatedArticles(
      [
        a("Token bucket explained", [], "2026-09-01"),
        a("Unrelated", ["infra"], "2026-09-30"),
        a("Tag only", ["infra", "reliability"], "2026-09-29"),
        a("Rate limiter with token bucket", [], "2026-08-01"),
        a("Another token bucket", [], "2026-09-15"),
      ],
      kws,
      ["infra", "reliability"],
    );
    expect(out.map((x) => x.title)).toEqual(["Rate limiter with token bucket", "Another token bucket", "Token bucket explained", "Tag only"]);
  });
});

describe("formatClock", () => {
  it("formats countdown and overtime", () => {
    expect(formatClock(45 * 60)).toBe("45:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-65)).toBe("+1:05");
  });
});

describe("data/system-design.json", () => {
  const { framework, blocks, cases } = systemDesign;

  it("framework steps match the practice sections and budget", () => {
    expect(framework.steps.map((s) => s.id)).toEqual([...DESIGN_SECTION_IDS]);
    expect(framework.steps.reduce((n, s) => n + s.minutes, 0)).toBe(PRACTICE_MINUTES);
    expect(PRACTICE_MINUTES).toBe(45);
  });

  it("has unique rubric, block and case ids", () => {
    for (const ids of [framework.rubric.map((r) => r.id), blocks.map((b) => b.id), cases.map((c) => c.slug)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("uses every category at least once", () => {
    for (const category of DESIGN_CATEGORIES) expect(cases.some((c) => c.category === category)).toBe(true);
  });

  it.each(cases.map((c) => [c.slug, c] as const))("%s links to real syllabus content and blocks", (_slug, c) => {
    expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    expect(DESIGN_CATEGORIES).toContain(c.category);
    expect(topicById.has(c.topicId)).toBe(true);
    expect(subtopicById.get(c.practiceRef)?.topicId).toBe(c.topicId);
    for (const b of c.blocks) expect(designBlockById.has(b)).toBe(true);
    expect(c.diagram.trimStart()).toMatch(/^flowchart (LR|TD|TB|RL)\b/);
    expect(c.diagram).not.toMatch(/^\s*click\s|<script|javascript:/im);
    expect(c.keywords.length).toBeGreaterThan(0);
    expect(c.functional.length).toBeGreaterThan(0);
    expect(c.deepDives.length).toBeGreaterThan(0);
    for (const r of c.readings) expect(["https:", "http:"]).toContain(new URL(r.url).protocol);
  });
});
