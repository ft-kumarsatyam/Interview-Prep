/**
 * Zod schemas for data/genai-playbook/plan.json (the 23-week GenAI interview playbook schedule) and the
 * scores a review form may save. Pure.
 */
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const key = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const TASK_KINDS = ["learn", "build", "drill", "review", "dsa"] as const;
export const TASK_ID = /^p\d{3}t\d+$/;

/** Readiness gates from the playbook (section 10). */
export const READINESS_DOMAINS = [
  { id: "python-sql", label: "Python / SQL" },
  { id: "llm", label: "LLM fundamentals" },
  { id: "rag", label: "RAG" },
  { id: "agents", label: "Agents" },
  { id: "production", label: "Production" },
  { id: "system-design", label: "System design" },
  { id: "project", label: "Project defense" },
  { id: "behavioral", label: "Behavioral" },
] as const;
export type ReadinessDomainId = (typeof READINESS_DOMAINS)[number]["id"];

/** Saturday mock scoring rubric (section 3), each scored 1-5. */
export const MOCK_DIMENSIONS = [
  { id: "framing", label: "Problem framing" },
  { id: "correctness", label: "Technical correctness" },
  { id: "tradeoffs", label: "Trade-offs" },
  { id: "communication", label: "Communication" },
  { id: "reliability", label: "Testing / reliability" },
  { id: "ownership", label: "Ownership / evidence" },
] as const;
export type MockDimensionId = (typeof MOCK_DIMENSIONS)[number]["id"];

export const READINESS_LEVELS = ["Not studied", "Recognize terms", "Explain with notes", "Explain closed-book", "Implement / debug", "Handle follow-ups"] as const;

export const planTaskSchema = z.object({
  id: z.string().regex(TASK_ID),
  kind: z.enum(TASK_KINDS),
  text: z.string().min(1),
  minutes: z.number().int().positive(),
  href: z.string().startsWith("/").optional(),
  doneWhen: z.string().optional(),
});

export const planWeekSchema = z.object({
  id: z.string().regex(/^w\d{2}$/),
  title: z.string().min(1),
  start: dateStr,
  end: dateStr,
  /** `courseId/lessonId` of the in-site reading. */
  lesson: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/),
  /** Node id in the genai-interview-playbook roadmap. */
  nodeId: key,
  domain: z.enum(READINESS_DOMAINS.map((d) => d.id) as [ReadinessDomainId, ...ReadinessDomainId[]]),
  practice: z.string().min(1),
  artifact: z.string().min(1),
});

export const planDaySchema = z.object({
  date: dateStr,
  weekday: z.string(),
  week: z.string().regex(/^w\d{2}$/),
  tasks: z.array(planTaskSchema).min(1),
});

export const planSchema = z.object({
  as_of: dateStr,
  start_date: dateStr,
  end_date: dateStr,
  weeks: z.array(planWeekSchema).min(1),
  days: z.array(planDaySchema).min(1),
});

export type PlanTask = z.infer<typeof planTaskSchema>;
export type PlanWeek = z.infer<typeof planWeekSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type Plan = z.infer<typeof planSchema>;

const readinessScores = z.partialRecord(z.enum(READINESS_DOMAINS.map((d) => d.id) as [ReadinessDomainId, ...ReadinessDomainId[]]), z.number().int().min(0).max(5));
const mockScores = z.partialRecord(z.enum(MOCK_DIMENSIONS.map((d) => d.id) as [MockDimensionId, ...MockDimensionId[]]), z.number().int().min(1).max(5));

export const reviewInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("readiness"), weekId: z.string().regex(/^w\d{2}$/), scores: readinessScores, note: z.string().max(1000).default("") }),
  z.object({ kind: z.literal("mock"), weekId: z.string().regex(/^w\d{2}$/), scores: mockScores, note: z.string().max(1000).default("") }),
]);
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const SOURCE_PRIORITIES = ["core", "role_specific", "supplemental", "stretch"] as const;
export const SOURCE_TYPES = ["official_docs", "course", "university", "security_standard", "interview_practice", "repository"] as const;
/** Licence statuses from data/genai-playbook/ATTRIBUTION.md. Only the two named repositories may be CC-BY-4.0 or MIT. */
export const LICENCE_STATUSES = ["official_reference_link", "CC-BY-4.0", "MIT", "unknown_link_only"] as const;

const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const sourceMapSchema = z.object({
  as_of: dateStr,
  note: z.string(),
  lessons: z.array(
    z.object({
      topic: z.string().min(3),
      learning_outcome: z.string().min(10),
      priority: z.enum(SOURCE_PRIORITIES),
      primary_source_url: https,
      supplemental_source_urls: z.array(https),
      source_type: z.enum(SOURCE_TYPES),
      licence_status: z.enum(LICENCE_STATUSES),
      lesson_id: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/),
      hands_on_task: z.string().min(10),
      assessment: z.string().min(10),
      interview_questions: z.array(z.string()),
      estimated_minutes: z.number().int().positive(),
      prerequisites: z.string().min(3),
    }),
  ),
  coverage: z.array(
    z.object({ domain: z.string(), priority: z.enum(SOURCE_PRIORITIES), required_proof: z.string(), lessons: z.array(z.string()), plan: z.string().optional() }),
  ),
  sources: z.record(z.string(), z.object({ title: z.string(), url: https, source_type: z.enum(SOURCE_TYPES), licence_status: z.enum(LICENCE_STATUSES) })),
});
export type SourceMap = z.infer<typeof sourceMapSchema>;
