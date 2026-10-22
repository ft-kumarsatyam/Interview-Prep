/**
 * Zod schemas for data/genai-prep-pack/*.json (see SCHEMA.md in that folder).
 */
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const TASK_KINDS = ["setup", "dsa", "learn", "build", "drill", "review"] as const;
export const RESOURCE_MODULES = [
  "py",
  "dsa",
  "math",
  "ml",
  "dl",
  "nlp",
  "llm",
  "prompt",
  "rag",
  "agents",
  "apps",
  "ops",
  "multi",
  "safety",
  "design",
  "interview",
] as const;
export const RESOURCE_LEVELS = ["core", "deep", "optional"] as const;
export const RESOURCE_TYPES = ["video", "blog", "docs", "paper", "course", "repo", "tool", "book", "practice"] as const;

const packResourceRefSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  url: https,
  type: z.string(),
  source: z.string(),
  verified: z.boolean(),
});

const packProblemRefSchema = z.object({
  slug: z.string(),
  title: z.string(),
  pattern: z.string().optional(),
  url: https,
});

export const packTaskSchema = z.object({
  id: z.string().regex(/^d\d+t\d+$/),
  kind: z.enum(TASK_KINDS),
  text: z.string().min(1),
  hours: z.number().positive(),
  done_when: z.string().nullable(),
  resources: z.array(packResourceRefSchema),
  problems: z.array(packProblemRefSchema),
  questions: z.array(z.string()),
});

export const packDaySchema = z.object({
  day_index: z.number().int().min(0),
  day_number: z.number().int().min(1),
  date: dateStr,
  weekday: z.string(),
  hours: z.number(),
  tasks: z.array(packTaskSchema).min(1),
});

export const packBlockSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  goal: z.string(),
  days: z.array(packDaySchema).min(1),
});

export const packPlanSchema = z.object({
  as_of: dateStr,
  start_date: dateStr,
  end_date: dateStr,
  days: z.number().int(),
  total_hours: z.number(),
  task_kinds: z.array(z.enum(TASK_KINDS)),
  blocks: z.array(packBlockSchema).min(1),
});

export const packResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  source: z.string(),
  url: https,
  type: z.enum(RESOURCE_TYPES),
  modules: z.array(z.enum(RESOURCE_MODULES)).min(1),
  level: z.enum(RESOURCE_LEVELS),
  why: z.string(),
  verified: z.boolean(),
  verified_on: dateStr.nullable(),
  verification: z.string(),
});

export const packResourcesFileSchema = z.object({
  as_of: dateStr,
  note: z.string(),
  resources: z.array(packResourceSchema).min(1),
});

export const packDsaPatternSchema = z.object({
  pattern: z.string(),
  goal: z.string(),
  say_aloud: z.string(),
  problems: z.array(z.object({ slug: z.string(), title: z.string(), url: https })),
});

export const packDsaFileSchema = z.object({
  as_of: dateStr,
  problem_count_in_catalog: z.number().int(),
  planned_problem_count: z.number().int(),
  planned_slugs: z.array(z.string()),
  habits: z.array(z.string()),
  patterns: z.array(packDsaPatternSchema),
  ai_implementations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      plan_week: z.string(),
      ties_to: z.string(),
      spec: z.string(),
      done_when: z.string(),
    }),
  ),
  references: z.array(packResourceRefSchema),
});

export const packProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan_week: z.string(),
  build_days: z.string(),
  pitch: z.string(),
  why_it_stands_out: z.string(),
  corpus_ideas: z.array(z.string()),
  mvp: z.array(z.string()),
  architecture: z.array(z.string()),
  key_decisions: z.array(z.string()),
  evaluation: z.array(z.string()),
  failure_modes_to_show: z.array(z.string()),
  stack: z.array(z.string()),
  deliverables: z.array(z.string()),
  talking_points: z.array(z.string()),
  extensions: z.array(z.string()),
  resources: z.array(packResourceRefSchema),
});

export const packProjectsFileSchema = z.object({
  as_of: dateStr,
  recommended_order: z.array(z.string()),
  note: z.string(),
  projects: z.array(packProjectSchema).min(1),
});

export const packQuestionsFileSchema = z.object({
  as_of: dateStr,
  groups: z.array(z.object({ id: z.string(), questions: z.array(z.string()).min(1) })),
  model_answer_outlines: z.array(z.object({ question: z.string(), outline: z.string() })),
  note: z.string(),
});

export const mappingEntrySchema = z.object({
  taskId: z.string().regex(/^d\d+t\d+$/),
  blockId: z.string().optional(),
  courseLesson: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional(),
  roadmapNode: z.string().optional(),
  webLesson: z.string().optional(),
  projectId: z.string().optional(),
});

export const packMappingFileSchema = z.object({
  as_of: dateStr,
  blocks: z.record(
    z.string(),
    z.object({
      courseLessons: z.array(z.string()),
      roadmapNodes: z.array(z.string()).optional(),
      webTracks: z.array(z.string()).optional(),
    }),
  ),
  tasks: z.array(mappingEntrySchema),
});

export type PackPlan = z.infer<typeof packPlanSchema>;
export type PackTask = z.infer<typeof packTaskSchema>;
export type PackBlock = z.infer<typeof packBlockSchema>;
export type PackResource = z.infer<typeof packResourceSchema>;
export type PackDsaFile = z.infer<typeof packDsaFileSchema>;
export type PackProject = z.infer<typeof packProjectSchema>;
export type PackQuestionsFile = z.infer<typeof packQuestionsFileSchema>;
export type PackMappingFile = z.infer<typeof packMappingFileSchema>;
