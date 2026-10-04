"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { CUSTOM_SOURCES, draftInputSchema, generateInputSchema, type CustomProblemDraft } from "@/modules/dsa/domain/custom-problem";
import { deleteCustomProblem, draftFromStatement, generateProblem, recordCustomResult, saveCustomProblem, type GeneratedProblem } from "@/modules/dsa/services/custom-problems";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export async function generateProblemAction(input: z.input<typeof generateInputSchema>): Promise<ActionResult<{ result: GeneratedProblem }>> {
  await requireSession();
  const parsed = generateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a topic and a difficulty" };
  const res = await generateProblem(parsed.data);
  return res.ok ? { ok: true, result: res.result } : res;
}

export async function draftFromStatementAction(input: z.input<typeof draftInputSchema>): Promise<ActionResult<{ draft: CustomProblemDraft }>> {
  await requireSession();
  const parsed = draftInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paste a statement of at least 20 characters" };
  const res = await draftFromStatement(parsed.data.statement);
  return res.ok ? { ok: true, draft: res.draft } : { ok: false, error: res.error };
}

const saveSchema = z.object({ source: z.enum(CUSTOM_SOURCES), problem: z.unknown() });

export async function saveCustomProblemAction(input: z.input<typeof saveSchema>): Promise<ActionResult<{ slug: string }>> {
  await requireSession();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid problem" };
  const res = await saveCustomProblem(parsed.data.problem, parsed.data.source);
  if (res.ok) refresh();
  return res;
}

export async function deleteCustomProblemAction(slug: string): Promise<ActionResult> {
  await requireSession();
  if (!slugSchema.safeParse(slug).success) return { ok: false, error: "Unknown problem" };
  await deleteCustomProblem(slug);
  refresh();
  return { ok: true };
}

const resultSchema = z.object({
  slug: slugSchema,
  accepted: z.boolean(),
  language: z.enum(["javascript", "typescript", "python"]),
  ms: z.number().int().min(0).max(600_000),
});

export async function recordCustomResultAction(input: z.input<typeof resultSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid result" };
  await recordCustomResult(parsed.data.slug, parsed.data);
  return { ok: true };
}
