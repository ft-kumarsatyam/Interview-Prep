/**
 * Typed access to the roadmaps (data/roadmaps/*.json), in catalogue order. Not part of the syllabus, so the
 * plan never schedules them and they never touch the streak.
 */
import aiEngineerJson from "@/data/roadmaps/ai-engineer.json";
import backendJson from "@/data/roadmaps/backend.json";
import dsaJson from "@/data/roadmaps/dsa.json";
import frontendJson from "@/data/roadmaps/frontend.json";
import frontendScaleJson from "@/data/roadmaps/frontend-scale.json";
import fullstackJson from "@/data/roadmaps/fullstack.json";
import systemDesignJson from "@/data/roadmaps/system-design.json";
import { webLessonById } from "@/core/content";
import { courseLessonByKey } from "@/core/courses";
import { roadmapSchema, type Roadmap } from "@/modules/roadmap/domain/roadmap";

/** Parsed through the schema so defaults (empty links and problems) apply and a bad file fails loudly. */
export const roadmaps: Roadmap[] = [dsaJson, systemDesignJson, backendJson, frontendJson, frontendScaleJson, fullstackJson, aiEngineerJson].map((j) => roadmapSchema.parse(j));
export const roadmapById = new Map(roadmaps.map((r) => [r.id, r]));

/** Prefix of a node `lesson` that points at a web lesson (data/webdev) instead of a course lesson. */
export const WEB_LESSON_PREFIX = "web/";

/** The in-app lesson a node links to: a course lesson (`courseId/lessonId`) or a web lesson (`web/lessonId`). */
export function roadmapLesson(key: string): { title: string; href: string } | undefined {
  if (key.startsWith(WEB_LESSON_PREFIX)) {
    const l = webLessonById.get(key.slice(WEB_LESSON_PREFIX.length));
    return l ? { title: l.title, href: `/web/${l.id}` } : undefined;
  }
  const c = courseLessonByKey.get(key);
  return c ? { title: c.title, href: `/courses/${c.courseId}/${c.id}` } : undefined;
}

export interface RoadmapNodeRef {
  roadmapId: string;
  roadmapTitle: string;
  nodeId: string;
  nodeTitle: string;
}

const addRef = (map: Map<string, RoadmapNodeRef[]>, key: string, ref: RoadmapNodeRef) => map.set(key, [...(map.get(key) ?? []), ref]);

/** `courseId/lessonId` and problem slug → the roadmap nodes that include them (the reverse of node.lesson / node.problems). */
export const roadmapNodesByLesson = new Map<string, RoadmapNodeRef[]>();
export const roadmapNodesByProblem = new Map<string, RoadmapNodeRef[]>();
for (const r of roadmaps) {
  for (const s of r.sections) {
    for (const n of s.nodes) {
      const ref = { roadmapId: r.id, roadmapTitle: r.title, nodeId: n.id, nodeTitle: n.title };
      if (n.lesson) addRef(roadmapNodesByLesson, n.lesson, ref);
      for (const p of n.problems) addRef(roadmapNodesByProblem, p, ref);
    }
  }
}
