import type { ContentProblem } from "@/core/content";
import { z } from "zod";

export const EXTERNAL_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type ExternalDifficulty = (typeof EXTERNAL_DIFFICULTIES)[number];

export const EXTERNAL_PROGRESS = ["not-started", "in-progress", "completed"] as const;
export type ExternalProgress = (typeof EXTERNAL_PROGRESS)[number];

export type ResourceKind = "article" | "video" | "practice" | "experience" | "company";

export interface ExternalLink {
  kind: ResourceKind;
  label: string;
  url: string;
  scope: "item" | "hub";
}

export interface CompanyTag {
  company: string;
  confidence: "high" | "medium" | "low";
  sourceUrl?: string;
  sourceKind?: "leetcode" | "gfg" | "code360" | "experience" | "other";
  lastVerified?: string;
}

export interface ExternalQuestion {
  id: string;
  sheetId: string;
  order: number;
  section: string;
  category: string;
  difficulty: ExternalDifficulty;
  title: string;
  recognitionSignal?: string;
  prompt?: string;
  technique?: string;
  leetcodeId?: number;
  localSlug?: string;
  links: ExternalLink[];
  companies: CompanyTag[];
  priority?: "high" | "medium" | "low";
  notes?: string;
  sourceCoverage: "exact" | "partial" | "hub-only" | "unmatched";
}

export interface ExternalSheet {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  description: string;
  updatedAt: string;
  moduleCount?: number;
  topicCount?: number;
  practiceProblemCount?: number;
  sourceSnapshot?: string;
  sections: string[];
  questions: ExternalQuestion[];
}

export interface ExternalResource {
  id: string;
  subject: string;
  topic: string;
  title: string;
  kind: ResourceKind;
  difficulty?: ExternalDifficulty;
  url: string;
  description: string;
  source: string;
}

const externalLinkSchema = z.object({
  kind: z.enum(["article", "video", "practice", "experience", "company"]),
  label: z.string().trim().min(1).max(80),
  url: z.url(),
  scope: z.enum(["item", "hub"]),
});

const companyTagSchema = z.object({
  company: z.string().trim().min(1).max(80),
  confidence: z.enum(["high", "medium", "low"]),
  sourceUrl: z.url().optional(),
  sourceKind: z.enum(["leetcode", "gfg", "code360", "experience", "other"]).optional(),
  lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const externalQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  sheetId: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().positive(),
  section: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  difficulty: z.enum(EXTERNAL_DIFFICULTIES),
  title: z.string().trim().min(1).max(240),
  recognitionSignal: z.string().max(300).optional(),
  prompt: z.string().max(500).optional(),
  technique: z.string().max(160).optional(),
  leetcodeId: z.number().int().positive().optional(),
  localSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  links: z.array(externalLinkSchema),
  companies: z.array(companyTagSchema),
  priority: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().max(500).optional(),
  sourceCoverage: z.enum(["exact", "partial", "hub-only", "unmatched"]),
});

export const externalSheetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(120),
  sourceUrl: z.url(),
  description: z.string().trim().min(1).max(500),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moduleCount: z.number().int().positive().optional(),
  topicCount: z.number().int().positive().optional(),
  practiceProblemCount: z.number().int().positive().optional(),
  sourceSnapshot: z.url().optional(),
  sections: z.array(z.string().trim().min(1)).min(1),
  questions: z.array(externalQuestionSchema),
});

export const externalCatalogueSchema = z.object({
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  sheets: z.array(externalSheetSchema).min(1),
});

export const externalResourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  kind: z.enum(["article", "video", "practice", "experience", "company"]),
  difficulty: z.enum(EXTERNAL_DIFFICULTIES).optional(),
  url: z.url(),
  description: z.string().trim().min(1).max(500),
  source: z.string().trim().min(1).max(120),
});

export const externalResourcesSchema = z.object({ resources: z.array(externalResourceSchema).min(1) });

export interface ExternalFilters {
  query: string;
  difficulty: ExternalDifficulty | "all";
  category: string;
  company: string;
  status: ExternalProgress | "all";
}

export interface TimerState {
  elapsedSeconds: number;
  running: boolean;
  startedAt: number | null;
}

export const EMPTY_TIMER: TimerState = { elapsedSeconds: 0, running: false, startedAt: null };

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchExternalQuestion(
  question: Pick<ExternalQuestion, "leetcodeId" | "title" | "localSlug">,
  problems: readonly ContentProblem[],
): string | undefined {
  if (question.localSlug && problems.some((problem) => problem.slug === question.localSlug)) return question.localSlug;
  if (question.leetcodeId !== undefined) {
    const byId = problems.find((problem) => problem.leetcodeId === question.leetcodeId);
    if (byId) return byId.slug;
  }
  const title = normalizeTitle(question.title);
  return problems.find((problem) => normalizeTitle(problem.title) === title)?.slug;
}

export function filterExternalQuestions(
  questions: readonly ExternalQuestion[],
  filters: ExternalFilters,
  statuses: ReadonlyMap<string, ExternalProgress> = new Map(),
): ExternalQuestion[] {
  const query = filters.query.trim().toLowerCase();
  return questions.filter((question) => {
    if (query && ![question.title, question.category, question.section, question.technique ?? ""].some((value) => value.toLowerCase().includes(query))) return false;
    if (filters.difficulty !== "all" && question.difficulty !== filters.difficulty) return false;
    if (filters.category && question.category !== filters.category) return false;
    if (filters.company && !question.companies.some((tag) => tag.company === filters.company)) return false;
    if (filters.status !== "all" && (statuses.get(question.id) ?? "not-started") !== filters.status) return false;
    return true;
  });
}

export function summarizeExternalProgress(
  questions: readonly ExternalQuestion[],
  statuses: ReadonlyMap<string, ExternalProgress>,
): { completed: number; total: number; byDifficulty: Record<ExternalDifficulty, { completed: number; total: number }> } {
  const byDifficulty = Object.fromEntries(EXTERNAL_DIFFICULTIES.map((difficulty) => [difficulty, { completed: 0, total: 0 }])) as Record<ExternalDifficulty, { completed: number; total: number }>;
  for (const question of questions) {
    const bucket = byDifficulty[question.difficulty];
    bucket.total += 1;
    if (statuses.get(question.id) === "completed") bucket.completed += 1;
  }
  return { completed: EXTERNAL_DIFFICULTIES.reduce((sum, difficulty) => sum + byDifficulty[difficulty].completed, 0), total: questions.length, byDifficulty };
}

export function toggleTimer(state: TimerState, now: number): TimerState {
  if (state.running) {
    return { elapsedSeconds: state.elapsedSeconds + Math.max(0, Math.floor((now - (state.startedAt ?? now)) / 1000)), running: false, startedAt: null };
  }
  return { ...state, running: true, startedAt: now };
}

export function resetTimer(): TimerState {
  return EMPTY_TIMER;
}

export function elapsedSecondsAt(state: TimerState, now: number): number {
  return state.elapsedSeconds + (state.running ? Math.max(0, Math.floor((now - (state.startedAt ?? now)) / 1000)) : 0);
}

export function minutesFromSeconds(seconds: number): number {
  return Math.max(0, Math.round(seconds / 60));
}
