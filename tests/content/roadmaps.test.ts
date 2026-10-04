import { describe, expect, it } from "vitest";
import { problemBySlug, subtopicById, topicById, webLessonById } from "@/core/content";
import { courseLessonByKey } from "@/core/courses";
import { roadmapById, roadmapLesson, roadmaps, WEB_LESSON_PREFIX } from "@/core/roadmaps";
import { allNodes, roadmapProblems, roadmapSchema } from "@/modules/roadmap/domain/roadmap";

describe("data/roadmaps", () => {
  it.each(roadmaps.map((r) => [r.id, r] as const))("%s matches the schema", (_id, r) => {
    const parsed = roadmapSchema.safeParse(r);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("is internally consistent and links only real problems, lessons and quizzes", () => {
    const problems = roadmapProblems(roadmaps, {
      problem: (s) => problemBySlug.has(s),
      lesson: (k) => courseLessonByKey.has(k) || (k.startsWith(WEB_LESSON_PREFIX) && webLessonById.has(k.slice(WEB_LESSON_PREFIX.length))),
      quiz: (r) => subtopicById.has(r) || topicById.has(r),
    });
    expect(problems).toEqual([]);
    expect(roadmapById.size).toBe(roadmaps.length);
  });

  it("covers frontend, frontend at scale, full stack and AI engineering", () => {
    expect([...roadmapById.keys()]).toEqual(expect.arrayContaining(["dsa", "system-design", "backend", "frontend", "frontend-scale", "fullstack", "ai-engineer"]));
  });

  it("resolves web and course lessons to in-app links", () => {
    expect(roadmapLesson("web/react-rendering")?.href).toBe("/web/react-rendering");
    expect(roadmapLesson("system-design/caching")?.href).toBe("/courses/system-design/caching");
    expect(roadmapLesson("web/nope")).toBeUndefined();
  });

  it("is deep: many nodes, each with a checklist of topics to tick", () => {
    const min: Record<string, number> = { dsa: 55, "system-design": 55, backend: 60, frontend: 80, "frontend-scale": 55, fullstack: 75, "ai-engineer": 65 };
    for (const r of roadmaps) {
      const nodes = allNodes(r);
      expect(nodes.length, r.id).toBeGreaterThanOrEqual(min[r.id] ?? 20);
      for (const n of nodes) {
        expect(n.checklist.length, `${r.id}/${n.id}`).toBeGreaterThanOrEqual(4);
        expect(n.links.length + (n.lesson ? 1 : 0), `${r.id}/${n.id}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("every roadmap offers all three priorities", () => {
    for (const r of roadmaps) {
      const p = new Set(allNodes(r).map((n) => n.priority));
      expect(p.has("must"), r.id).toBe(true);
      expect(p.has("can"), r.id).toBe(true);
      expect(p.has("skip"), r.id).toBe(true);
    }
  });
});
