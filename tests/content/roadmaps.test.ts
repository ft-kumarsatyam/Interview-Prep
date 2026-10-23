import { beforeAll, describe, expect, it } from "vitest";
import { problemBySlug, subtopicById, topicById } from "@/core/content";
import { webLessonById } from "@/core/content/webdev";
import { hasCourseLesson } from "@/core/courses";
import { loadAllRoadmaps, roadmapLesson, roadmapMeta, WEB_LESSON_PREFIX } from "@/core/roadmaps";
import { allNodes, roadmapProblems, roadmapSchema, type Roadmap } from "@/modules/roadmap/domain/roadmap";

describe("data/roadmaps", () => {
  let roadmaps: Roadmap[] = [];

  beforeAll(async () => {
    roadmaps = await loadAllRoadmaps();
  });

  it("every roadmap matches the schema", () => {
    for (const r of roadmaps) {
      const parsed = roadmapSchema.safeParse(r);
      expect(parsed.success, parsed.success ? r.id : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    }
  });

  it("is internally consistent and links only real problems, lessons and quizzes", () => {
    const problems = roadmapProblems(roadmaps, {
      problem: (s) => problemBySlug.has(s),
      lesson: (k) => hasCourseLesson(k) || (k.startsWith(WEB_LESSON_PREFIX) && webLessonById.has(k.slice(WEB_LESSON_PREFIX.length))),
      quiz: (r) => subtopicById.has(r) || topicById.has(r),
    });
    expect(problems).toEqual([]);
    expect(roadmapMeta().map((m) => m.id)).toEqual(roadmaps.map((r) => r.id));
  });

  it("covers frontend, frontend at scale, full stack and AI engineering", () => {
    expect(roadmapMeta().map((m) => m.id)).toEqual(
      expect.arrayContaining(["dsa", "backend", "frontend", "frontend-scale", "fullstack", "ai-engineer", "genai-16-levels", "genai-100-days", "genai-interview-playbook"]),
    );
  });

  it("resolves web and course lessons to in-app links", async () => {
    expect((await roadmapLesson("web/react-rendering"))?.href).toBe("/web/react-rendering");
    expect((await roadmapLesson("system-design/caching"))?.href).toBe("/courses/system-design/caching");
    expect(await roadmapLesson("web/nope")).toBeUndefined();
  });

  it("is deep: many nodes, each with a checklist of topics to tick", () => {
    const min: Record<string, number> = { dsa: 55, backend: 60, frontend: 80, "frontend-scale": 55, fullstack: 75, "ai-engineer": 110, "genai-16-levels": 180, "genai-100-days": 100, "genai-interview-playbook": 30 };
    for (const r of roadmaps) {
      const nodes = allNodes(r);
      expect(nodes.length, r.id).toBeGreaterThanOrEqual(min[r.id] ?? 20);
      for (const n of nodes) {
        expect(n.checklist.length, `${r.id}/${n.id}`).toBeGreaterThanOrEqual(3);
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
