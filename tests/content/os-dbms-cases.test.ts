import { describe, expect, it } from "vitest";
import { practiceCases, subtopicById, topicById } from "@/lib/content";
import { EXPLAIN_MINUTES, EXPLAIN_RUBRIC, EXPLAIN_SECTION_IDS, explainSectionsAttempted, practiceStatus } from "@/lib/domain/practice-cases";

const words = (n: number) => Array(n).fill("word").join(" ");

describe("explain template", () => {
  it("is a 20 minute, 5 section round with a 5 item rubric", () => {
    expect(EXPLAIN_SECTION_IDS).toHaveLength(5);
    expect(EXPLAIN_MINUTES).toBe(20);
    expect(EXPLAIN_RUBRIC).toHaveLength(5);
  });
});

describe("explainSectionsAttempted", () => {
  it("needs the minimum word count per section", () => {
    expect(explainSectionsAttempted({ definition: words(15), example: words(14), tradeoffs: "  " })).toBe(1);
  });
  it("ignores unknown keys", () => {
    expect(explainSectionsAttempted({ nonsense: words(50) })).toBe(0);
  });
});

describe("practiceStatus", () => {
  const base = { topicMastered: false, subtopicsDone: 0, sectionsAttempted: 0, rubricPct: 0 };
  it("walks new -> studying -> practised -> mastered", () => {
    expect(practiceStatus(base)).toBe("new");
    expect(practiceStatus({ ...base, subtopicsDone: 1 })).toBe("studying");
    expect(practiceStatus({ ...base, sectionsAttempted: 5, rubricPct: 40 })).toBe("studying");
    expect(practiceStatus({ ...base, sectionsAttempted: 5, rubricPct: 60 })).toBe("practised");
    expect(practiceStatus({ ...base, topicMastered: true })).toBe("mastered");
  });
});

describe("data/os-dbms-cases.json", () => {
  it("has unique slugs across both kinds", () => {
    const slugs = practiceCases.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("covers both OS and DBMS", () => {
    expect(practiceCases.filter((c) => c.kind === "os").length).toBeGreaterThanOrEqual(8);
    expect(practiceCases.filter((c) => c.kind === "dbms").length).toBeGreaterThanOrEqual(8);
  });

  it.each(practiceCases.map((c) => [`${c.kind}:${c.slug}`, c] as const))("%s links to real syllabus content and is complete", (_id, c) => {
    expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    expect(["os", "dbms"]).toContain(c.kind);
    const topic = topicById.get(c.topicId);
    expect(topic, "topicId must exist in syllabus.json").toBeDefined();
    expect(topic?.track).toBe(c.kind === "os" ? "cs" : "dbms");
    expect(subtopicById.get(c.practiceRef)?.topicId).toBe(c.topicId);
    expect(c.title.length).toBeGreaterThan(5);
    expect(c.summary.length).toBeGreaterThan(30);
    expect(c.keywords.length).toBeGreaterThan(0);
    expect(c.prompt.length).toBeGreaterThan(0);
    expect(c.talkingPoints.length).toBeGreaterThanOrEqual(4);
    expect(c.tradeoffs.length).toBeGreaterThan(0);
    expect(c.probes.length).toBeGreaterThan(0);
    expect(c.readings.length).toBeGreaterThan(0);
    for (const r of c.readings) expect(() => new URL(r.url)).not.toThrow();
    for (const r of c.readings) expect(new URL(r.url).protocol).toBe("https:");
    if (c.diagram) {
      expect(c.diagram.trimStart()).toMatch(/^flowchart (LR|TD|TB|RL)\b/);
      expect(c.diagram).not.toMatch(/^\s*click\s|<script|javascript:/im);
    }
  });
});
