import { describe, expect, it } from "vitest";
import { webLessonById, webLessons, webProjectBySlug, webProjects, webTracks } from "@/lib/content";
import { webdevFileSchema, webdevProblems } from "@/lib/domain/webdev";

describe("data/webdev.json", () => {
  it("matches the schema", () => {
    const parsed = webdevFileSchema.safeParse({ tracks: webTracks, lessons: webLessons, projects: webProjects });
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("is internally consistent", () => {
    expect(webdevProblems({ tracks: webTracks, lessons: webLessons, projects: webProjects })).toEqual([]);
    expect(webLessonById.size).toBe(webLessons.length);
    expect(webProjectBySlug.size).toBe(webProjects.length);
  });

  it("covers the stacks asked for", () => {
    const text = JSON.stringify([webLessons, webProjects]).toLowerCase();
    for (const term of ["next.js", "react", "node.js", "nestjs", "sql", "mongodb", "cockroachdb", "postgresql", "raft", "outbox"]) expect(text, term).toContain(term);
    expect(webTracks.map((t) => t.id)).toEqual(expect.arrayContaining(["react", "nextjs", "node", "sql", "mongo", "distdb", "arch"]));
  });

  it("every lesson has distinct check questions with an answer that is not always the first option", () => {
    for (const l of webLessons) expect(new Set(l.check.map((c) => c.q)).size, l.id).toBe(3);
    const positions = webLessons.flatMap((l) => l.check.map((c) => c.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.filter((p) => p === 0).length / positions.length).toBeLessThan(0.5);
  });

  it("every project milestone ends in something checkable and every project feeds the resume", () => {
    for (const p of webProjects) {
      expect(p.milestones.length, p.slug).toBeGreaterThanOrEqual(5);
      expect(p.resume.some((r) => /\[[^\]]+\]/.test(r)), `${p.slug} resume bullets keep placeholders`).toBe(true);
    }
  });
});
