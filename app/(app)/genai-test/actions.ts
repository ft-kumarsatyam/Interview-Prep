"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { ANSWER_MAX_CHARS, TEST_KINDS } from "@/modules/genai-test/domain/schemas";
import { gradeWithAi, saveDraft, selfGrade, startAttempt, submitAttempt } from "@/modules/genai-test/services/test";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

const id = z.string().regex(/^[a-f0-9]{24}$/);
const answers = z.record(z.string().max(80), z.union([z.number().int().min(0).max(5), z.string().max(ANSWER_MAX_CHARS)]));

export async function startTestAction(input: unknown): Promise<ActionResult & { id?: string }> {
  await requireSession();
  const parsed = z.object({ kind: z.enum(TEST_KINDS), level: z.number().int().min(0).max(15).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown test" };
  const res = await startAttempt(parsed.data, todayIn(await getSettings()));
  if (!res.ok) return { ok: false, error: res.error };
  refresh();
  return { ok: true, id: res.id };
}

export async function saveDraftAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, answers }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answers" };
  const res = await saveDraft(parsed.data.id, parsed.data.answers);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function submitTestAction(input: unknown): Promise<ActionResult & { aiUnavailable?: boolean }> {
  await requireSession();
  const parsed = z.object({ id, answers }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answers" };
  const res = await submitAttempt(parsed.data.id, parsed.data.answers, todayIn(await getSettings()));
  if (!res.ok) return { ok: false, error: res.error };
  refresh();
  return { ok: true, aiUnavailable: res.aiUnavailable };
}

export async function gradeWithAiAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown test" };
  const res = await gradeWithAi(parsed.data.id);
  if (!res.ok) return { ok: false, error: res.error };
  refresh();
  return { ok: true };
}

export async function selfGradeAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, qid: z.string().max(80), scores: z.record(z.string().max(30), z.number().int().min(0).max(4)) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Scores are out of range" };
  const res = await selfGrade(parsed.data.id, parsed.data.qid, parsed.data.scores);
  if (!res.ok) return { ok: false, error: res.error };
  refresh();
  return { ok: true };
}
