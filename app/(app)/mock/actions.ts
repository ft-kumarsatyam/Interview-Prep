"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { takeToken } from "@/core/services/rate-limit";
import { readProject } from "@/modules/mock/services/project-interview";
import { MOCK_TYPES, RUBRIC_MAX, answerPatchSchema } from "@/modules/mock/domain/mock";
import { deleteMock, gradeMock, saveMockAnswer, selfGradeMock, startMock, submitMock } from "@/modules/mock/services/mock";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const qidSchema = z.string().regex(/^[a-z0-9-]{1,120}$/i);

const startSchema = z.object({
  type: z.enum(MOCK_TYPES),
  source: z.enum(["sheet", "custom", "mixed"]).default("mixed"),
  aiQuestions: z.boolean().default(false),
  project: z.string().trim().max(2000).optional(),
  projectRepo: z.string().trim().max(300).optional(),
  projectSite: z.string().trim().max(300).optional(),
});

export async function startMockAction(input: z.input<typeof startSchema>): Promise<ActionResult<{ id: string }> | { ok: false; error: string; resumeId?: string }> {
  await requireSession();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick an interview type" };
  return startMock({ ...parsed.data, project: parsed.data.project || undefined, projectRepo: parsed.data.projectRepo || undefined, projectSite: parsed.data.projectSite || undefined });
}

const saveSchema = z.object({ id: idSchema, qid: qidSchema, patch: answerPatchSchema });

export async function saveMockAnswerAction(input: z.input<typeof saveSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer" };
  return saveMockAnswer(parsed.data.id, parsed.data.qid, parsed.data.patch);
}

export async function submitMockAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Unknown mock" };
  const res = await submitMock(id);
  if (res.ok) refresh();
  return res;
}

export async function gradeMockAction(id: string): Promise<ActionResult<{ graded: number; remaining: number }> | { ok: false; error: string; unavailable?: true }> {
  await requireSession();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Unknown mock" };
  const res = await gradeMock(id);
  refresh();
  return res;
}

const selfSchema = z.object({ id: idSchema, qid: qidSchema, scores: z.record(z.string().max(40), z.number().int().min(0).max(RUBRIC_MAX)) });

export async function selfGradeMockAction(input: z.input<typeof selfSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = selfSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid scores" };
  const res = await selfGradeMock(parsed.data.id, parsed.data.qid, parsed.data.scores);
  if (res.ok) refresh();
  return res;
}

export async function deleteMockAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Unknown mock" };
  await deleteMock(id);
  refresh();
  return { ok: true };
}

const previewSchema = z.object({ repoUrl: z.string().trim().max(300), siteUrl: z.string().trim().max(300).optional() });

export interface ProjectPreview {
  name: string;
  stack: string[];
  filesRead: string[];
  note: string | null;
}

/** Shows what PrepOS read from the repository before any question is written, so you can see what the interview will be based on. */
export async function previewProjectAction(input: z.input<typeof previewSchema>): Promise<ActionResult<{ preview: ProjectPreview }>> {
  await requireSession();
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paste a GitHub repository link" };
  const limit = await takeToken("project-preview", { max: 20, windowSec: 3600 });
  if (!limit.allowed) return { ok: false, error: "Too many previews. Try again in a few minutes" };
  const res = await readProject({ repoUrl: parsed.data.repoUrl, ...(parsed.data.siteUrl ? { siteUrl: parsed.data.siteUrl } : {}) });
  if (!res.ok) return res;
  return { ok: true, preview: { name: res.brief.name, stack: res.brief.stack, filesRead: res.brief.filesRead, note: res.siteSkipped } };
}
