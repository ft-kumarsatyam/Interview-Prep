/**
 * Typed access to the roadmaps (data/roadmaps/*.json). Metadata is eager; full graphs load on demand.
 * Not part of the syllabus, so the plan never schedules them and they never touch the streak.
 */
import roadmapIndexJson from "@/data/roadmaps/index.json";
import { getCourseLessonMeta } from "@/core/courses";
import { roadmapSchema, type Roadmap } from "@/modules/roadmap/domain/roadmap";

export interface RoadmapMeta {
  id: string;
  title: string;
  blurb: string;
  audience: string;
  nodeCount: number;
  sectionCount: number;
}

export const roadmapMeta = (): RoadmapMeta[] => roadmapIndexJson as RoadmapMeta[];
export const knownRoadmap = (id: string): boolean => roadmapMeta().some((m) => m.id === id);

const ROADMAP_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  dsa: () => import("@/data/roadmaps/dsa.json"),
  backend: () => import("@/data/roadmaps/backend.json"),
  frontend: () => import("@/data/roadmaps/frontend.json"),
  "frontend-scale": () => import("@/data/roadmaps/frontend-scale.json"),
  fullstack: () => import("@/data/roadmaps/fullstack.json"),
  "ai-engineer": () => import("@/data/roadmaps/ai-engineer.json"),
  "genai-16-levels": () => import("@/data/roadmaps/genai-16-levels.json"),
  "genai-100-days": () => import("@/data/roadmaps/genai-100-days.json"),
  "genai-interview-playbook": () => import("@/data/roadmaps/genai-interview-playbook.json"),
};

const cache = new Map<string, Roadmap>();

export async function loadRoadmap(id: string): Promise<Roadmap | undefined> {
  const cached = cache.get(id);
  if (cached) return cached;
  const loader = ROADMAP_LOADERS[id];
  if (!loader) return undefined;
  const roadmap = roadmapSchema.parse((await loader()).default);
  cache.set(id, roadmap);
  return roadmap;
}

export async function loadAllRoadmaps(): Promise<Roadmap[]> {
  const all = await Promise.all(roadmapMeta().map((m) => loadRoadmap(m.id)));
  return all.filter((r): r is Roadmap => !!r);
}

export const WEB_LESSON_PREFIX = "web/";

export async function roadmapLesson(key: string): Promise<{ title: string; href: string } | undefined> {
  if (key.startsWith(WEB_LESSON_PREFIX)) {
    const { webLessonById } = await import("@/core/content/webdev");
    const l = webLessonById.get(key.slice(WEB_LESSON_PREFIX.length));
    return l ? { title: l.title, href: `/web/${l.id}` } : undefined;
  }
  const c = getCourseLessonMeta(key);
  return c ? { title: c.title, href: `/courses/${c.courseId}/${c.id}` } : undefined;
}

export interface RoadmapNodeRef {
  roadmapId: string;
  roadmapTitle: string;
  nodeId: string;
  nodeTitle: string;
}

const addRef = (map: Map<string, RoadmapNodeRef[]>, key: string, ref: RoadmapNodeRef) => map.set(key, [...(map.get(key) ?? []), ref]);

let reverse: { byLesson: Map<string, RoadmapNodeRef[]>; byProblem: Map<string, RoadmapNodeRef[]> } | undefined;

async function reverseIndex() {
  if (reverse) return reverse;
  const byLesson = new Map<string, RoadmapNodeRef[]>();
  const byProblem = new Map<string, RoadmapNodeRef[]>();
  for (const r of await loadAllRoadmaps()) {
    for (const s of r.sections) {
      for (const n of s.nodes) {
        const ref = { roadmapId: r.id, roadmapTitle: r.title, nodeId: n.id, nodeTitle: n.title };
        if (n.lesson) addRef(byLesson, n.lesson, ref);
        for (const p of n.problems) addRef(byProblem, p, ref);
      }
    }
  }
  reverse = { byLesson, byProblem };
  return reverse;
}

export async function roadmapNodesByLesson(key: string): Promise<RoadmapNodeRef[]> {
  return (await reverseIndex()).byLesson.get(key) ?? [];
}

export async function roadmapNodesByProblem(slug: string): Promise<RoadmapNodeRef[]> {
  return (await reverseIndex()).byProblem.get(slug) ?? [];
}
