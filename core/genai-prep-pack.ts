/**
 * Typed access to data/genai-prep-pack (45-day GenAI interview sprint content).
 */
import dsaJson from "@/data/genai-prep-pack/dsa.json";
import mappingJson from "@/data/genai-prep-pack/mapping.json";
import planJson from "@/data/genai-prep-pack/plan.json";
import projectsJson from "@/data/genai-prep-pack/projects.json";
import questionsJson from "@/data/genai-prep-pack/questions.json";
import resourcesJson from "@/data/genai-prep-pack/resources.json";
import {
  packDsaFileSchema,
  packMappingFileSchema,
  packPlanSchema,
  packProjectsFileSchema,
  packQuestionsFileSchema,
  packResourcesFileSchema,
  type PackBlock,
  type PackPlan,
  type PackResource,
  type PackTask,
} from "@/modules/genai-prep/domain/schemas";

function parse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } }, data: unknown, label: string): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${label}: ${JSON.stringify((r.error as { issues?: unknown[] })?.issues?.slice(0, 3))}`);
  return r.data as T;
}

export const genaiPrepPlan: PackPlan = parse(packPlanSchema, planJson, "plan.json");
export const genaiPrepResources = parse(packResourcesFileSchema, resourcesJson, "resources.json");
export const genaiPrepDsa = parse(packDsaFileSchema, dsaJson, "dsa.json");
export const genaiPrepProjects = parse(packProjectsFileSchema, projectsJson, "projects.json");
export const genaiPrepQuestions = parse(packQuestionsFileSchema, questionsJson, "questions.json");
export const genaiPrepMapping = parse(packMappingFileSchema, mappingJson, "mapping.json");

export const genaiPrepResourceById = new Map<string, PackResource>(genaiPrepResources.resources.map((r) => [r.id, r]));

/** All tasks in sprint order (block order, then day_index, then task order). */
export function flatPackTasks(plan: PackPlan = genaiPrepPlan): PackTask[] {
  const out: PackTask[] = [];
  for (const block of plan.blocks) {
    for (const day of block.days.toSorted((a, b) => a.day_index - b.day_index)) {
      out.push(...day.tasks);
    }
  }
  return out;
}

export function packBlockById(id: string, plan: PackPlan = genaiPrepPlan): PackBlock | undefined {
  return plan.blocks.find((b) => b.id === id);
}

export function packTasksForBlock(blockId: string, plan: PackPlan = genaiPrepPlan): PackTask[] {
  const block = packBlockById(blockId, plan);
  if (!block) return [];
  return block.days.toSorted((a, b) => a.day_index - b.day_index).flatMap((d) => d.tasks);
}

export function packTaskById(taskId: string, plan: PackPlan = genaiPrepPlan): PackTask | undefined {
  return flatPackTasks(plan).find((t) => t.id === taskId);
}
