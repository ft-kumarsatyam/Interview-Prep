/**
 * Typed access to the GenAI test content. Authored MCQs and the week/node maps are eager.
 * The question pool (playbook checks + study-note questions) loads the first time a test starts.
 */
import weekMapJson from "@/data/genai-test/week-map.json";
import nodeKeysJson from "@/data/genai-test/node-keys.json";
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
import { genaiPlaybookPlan, genaiPlaybookSourceMap } from "@/core/genai-playbook";
import type { LevelTopics } from "@/modules/genai-test/domain/coverage";
import type { McqQ, Pool, WrittenQ } from "@/modules/genai-test/domain/pool";
import { levelMcqSchema, weekMapSchema, type LevelMcq } from "@/modules/genai-test/domain/schemas";

export const ROADMAP_ID = "genai-16-levels";

export const genaiTestWeekMap = weekMapSchema.parse(weekMapJson);
export const levelMcqs: LevelMcq[] = [mcq0, mcq1, mcq2, mcq3, mcq4, mcq5, mcq6, mcq7, mcq8, mcq9, mcq10, mcq11, mcq12, mcq13, mcq15].flat().map((m) => levelMcqSchema.parse(m));

const nodeKeys = new Map(Object.entries(nodeKeysJson as Record<string, string[]>));
const levelOfNode = (node: string): number => Number(node.match(/^m(\d+)-/)?.[1] ?? -1);

export const weekLevels = (weekId: string): number[] => genaiTestWeekMap.weeks.find((w) => w.week === weekId)?.levels ?? [];

export function roadmapNodeKeys(): Map<string, string[]> {
  return new Map(nodeKeys);
}

export function levelTopics(): LevelTopics[] {
  const by = new Map<number, string[]>();
  for (const [node, keys] of nodeKeys) by.set(levelOfNode(node), [...(by.get(levelOfNode(node)) ?? []), ...keys.map((k) => `${node}/${k}`)]);
  return [...by].sort((a, b) => a[0] - b[0]).map(([level, topics]) => ({ level, topics }));
}

let cached: Pool | undefined;

export async function testPool(): Promise<Pool> {
  if (cached) return cached;
  const mcq: McqQ[] = [];
  const written: WrittenQ[] = [];
  const weekOfLesson = new Map(genaiPlaybookPlan.weeks.map((w) => [w.lesson, w.id]));
  const questionsOf = new Map(genaiPlaybookSourceMap.lessons.map((l) => [l.lesson_id, l.interview_questions]));

  const { loadCourse } = await import("@/core/courses");
  const playbook = await loadCourse("genai-playbook");
  if (playbook) {
    for (const ch of playbook.chapters) {
      for (const lesson of ch.lessons) {
        const key = `genai-playbook/${lesson.id}`;
        const weekId = weekOfLesson.get(key);
        const level = weekId ? (weekLevels(weekId)[0] ?? 15) : 15;
        lesson.check.forEach((c, i) => mcq.push({ kind: "mcq", id: `lc:${lesson.id}:${i}`, weekId, level, q: c.q, options: c.options, answer: c.answer, why: c.why }));
        (questionsOf.get(key) ?? []).forEach((q, i) => written.push({ kind: "written", id: `lq:${lesson.id}:${i}`, weekId, level, q, points: lesson.keyPoints, reference: lesson.keyPoints.join("\n") }));
      }
    }
  }

  for (const m of levelMcqs) mcq.push({ kind: "mcq", id: `lv:${m.id}`, level: m.level, node: m.node, q: m.q, options: m.options, answer: m.answer, why: m.why });

  const { loadAllStudyFiles } = await import("@/core/genai-study");
  for (const f of await loadAllStudyFiles()) {
    if (f.roadmapId !== ROADMAP_ID) continue;
    for (const [node, notes] of Object.entries(f.nodes))
      for (const [key, e] of Object.entries(notes))
        e.questions.forEach((q, i) => written.push({ kind: "written", id: `sq:${node}:${key}:${i}`, level: levelOfNode(node), node, topic: `${node}/${key}`, q: q.q, points: e.keyPoints, reference: q.a }));
  }

  cached = { mcq, written };
  return cached;
}
