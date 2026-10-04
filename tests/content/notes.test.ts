import { describe, expect, it } from "vitest";
import { noteFiles, subtopicById, subtopicNotes } from "@/core/content";
import { notesFileSchema, notesProblems, notesCoverage, readingMinutes } from "@/modules/learn/domain/notes";

describe("data/notes/*.json", () => {
  it.each(noteFiles.map((f, i) => [i, f] as const))("file %i matches the schema and the syllabus", (_i, file) => {
    const parsed = notesFileSchema.safeParse(file);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    expect(notesProblems(file, subtopicById)).toEqual([]);
  });

  it("has no subtopic defined in two files", () => {
    const all = noteFiles.flatMap((f) => Object.keys(f));
    expect(new Set(all).size).toBe(all.length);
    expect(subtopicNotes.size).toBe(all.length);
  });
});

describe("notes helpers", () => {
  it("flags unknown subtopics and unsafe diagrams", () => {
    const note = { body: "x".repeat(200), keyPoints: ["one point", "two point"], sources: [], diagram: "flowchart LR\nclick A href" };
    expect(notesProblems({ "nope:0": note }, new Map())).toEqual(["nope:0: no such subtopic", "nope:0: unsafe diagram"]);
  });

  it("computes coverage and reading time", () => {
    expect(notesCoverage("t", 4, { "t:0": 1, "t:2": 1 })).toBe(0.5);
    expect(notesCoverage("t", 0, {})).toBe(0);
    expect(readingMinutes("word ".repeat(450))).toBe(2);
    expect(readingMinutes("")).toBe(1);
  });
});

describe("data/engineering-blogs.json", () => {
  it("has unique https urls and tags", async () => {
    const { engineeringBlogs } = await import("@/core/content");
    const urls = engineeringBlogs.map((b) => b.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const b of engineeringBlogs) {
      expect(b.url.startsWith("https://"), b.name).toBe(true);
      expect(b.tags.length, b.name).toBeGreaterThan(0);
    }
  });
});
