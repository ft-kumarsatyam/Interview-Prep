/**
 * Typed access to the GenAI test content: the authored level MCQs (data/genai-test/mcq), the week-to-level map and
 * the question pool assembled from the playbook lessons and the study notes. Not part of the syllabus, so the plan
 * and streak never see it.
 */
import weekMapJson from "@/data/genai-test/week-map.json";
import mcq0 from "@/data/genai-test/mcq/level-0.json";
import mcq1 from "@/data/genai-test/mcq/level-1.json";
import mcq2 from "@/data/genai-test/mcq/level-2.json";
import mcq3 from "@/data/genai-test/mcq/level-3.json";
import mcq4 from "@/data/genai-test/mcq/level-4.json";
import mcq5 from "@/data/genai-test/mcq/level-5.json";
import mcq6 from "@/data/genai-test/mcq/level-6.json";
import mcq7 from "@/data/genai-test/mcq/level-7.json";
import mcq8 from "@/data/genai-test/mcq/level-8.json";
import mcq9 from "@/data/genai-test/mcq/level-9.json";
import mcq10 from "@/data/genai-test/mcq/level-10.json";
import mcq11 from "@/data/genai-test/mcq/level-11.json";
import mcq12 from "@/data/genai-test/mcq/level-12.json";
import mcq13 from "@/data/genai-test/mcq/level-13.json";
import mcq15 from "@/data/genai-test/mcq/level-15.json";
import { courseLessonByKey } from "@/core/courses";
import { genaiPlaybookPlan, genaiPlaybookSourceMap } from "@/core/genai-playbook";
import { studyFiles } from "@/core/genai-study";
import { roadmapById } from "@/core/roadmaps";
import { subtopicKey } from "@/modules/genai-study/domain/study";
import type { LevelTopics } from "@/modules/genai-test/domain/coverage";
import type { McqQ, Pool, WrittenQ } from "@/modules/genai-test/domain/pool";
import { levelMcqSchema, weekMapSchema, type LevelMcq } from "@/modules/genai-test/domain/schemas";

export const ROADMAP_ID = "genai-16-levels";

export const genaiTestWeekMap = weekMapSchema.parse(weekMapJson);
export const levelMcqs: LevelMcq[] = [mcq0, mcq1, mcq2, mcq3, mcq4, mcq5, mcq6, mcq7, mcq8, mcq9, mcq10, mcq11, mcq12, mcq13, mcq15].flat().map((m) => levelMcqSchema.parse(m));

const levelOfNode = (node: string): number => Number(node.match(/^m(\d+)-/)?.[1] ?? -1);

/** Roadmap levels of a playbook week, from the week map. */
export const weekLevels = (weekId: string): number[] => genaiTestWeekMap.weeks.find((w) => w.week === weekId)?.levels ?? [];

/** Module nodes of the 16-level roadmap with their checklist's topic keys, in checklist order. */
export function roadmapNodeKeys(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of roadmapById.get(ROADMAP_ID)?.sections ?? [])
    for (const n of s.nodes) if (/^m\d+-\d+$/.test(n.id)) out.set(n.id, n.checklist.map(subtopicKey));
  return out;
}

/** Every module topic per level, as `${node}/${key}`. */
export function levelTopics(): LevelTopics[] {
  const by = new Map<number, string[]>();
  for (const [node, keys] of roadmapNodeKeys()) by.set(levelOfNode(node), [...(by.get(levelOfNode(node)) ?? []), ...keys.map((k) => `${node}/${k}`)]);
  return [...by].sort((a, b) => a[0] - b[0]).map(([level, topics]) => ({ level, topics }));
}

let cached: Pool | undefined;

/** The question pool: lesson checks and interview questions of the playbook weeks, level MCQs and study-note questions. */
export function testPool(): Pool {
  if (cached) return cached;
  const mcq: McqQ[] = [];
  const written: WrittenQ[] = [];
  const weekOfLesson = new Map(genaiPlaybookPlan.weeks.map((w) => [w.lesson, w.id]));
  const questionsOf = new Map(genaiPlaybookSourceMap.lessons.map((l) => [l.lesson_id, l.interview_questions]));
  for (const [key, lesson] of courseLessonByKey) {
    if (!key.startsWith("genai-playbook/")) continue;
    const weekId = weekOfLesson.get(key);
    const level = weekId ? (weekLevels(weekId)[0] ?? 15) : 15;
    lesson.check.forEach((c, i) => mcq.push({ kind: "mcq", id: `lc:${lesson.id}:${i}`, weekId, level, q: c.q, options: c.options, answer: c.answer, why: c.why }));
    (questionsOf.get(key) ?? []).forEach((q, i) => written.push({ kind: "written", id: `lq:${lesson.id}:${i}`, weekId, level, q, points: lesson.keyPoints, reference: lesson.keyPoints.join("\n") }));
  }
  for (const m of levelMcqs) mcq.push({ kind: "mcq", id: `lv:${m.id}`, level: m.level, node: m.node, q: m.q, options: m.options, answer: m.answer, why: m.why });
  for (const f of studyFiles) {
    if (f.roadmapId !== ROADMAP_ID) continue;
    for (const [node, notes] of Object.entries(f.nodes))
      for (const [key, e] of Object.entries(notes))
        e.questions.forEach((q, i) => written.push({ kind: "written", id: `sq:${node}:${key}:${i}`, level: levelOfNode(node), node, topic: `${node}/${key}`, q: q.q, points: e.keyPoints, reference: q.a }));
  }
  cached = { mcq, written };
  return cached;
}
