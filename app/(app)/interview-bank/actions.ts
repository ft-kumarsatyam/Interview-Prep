"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { CATEGORIES, extractedItemSchema, type Candidate } from "@/modules/interview-bank/domain/bank";
import { addQuestion, deleteQuestion, draftForCompany, previewImport, saveImported, updateQuestion } from "@/modules/interview-bank/services/bank";

const fail = (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : "Something went wrong" });
const id = z.string().regex(/^own:[a-f0-9]{24}$/i, "Unknown question");

export async function addQuestionAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  try {
    const res = await addQuestion(input, "own");
    if (!res.ok) return res;
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateQuestionAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, question: z.unknown() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown question" };
  try {
    const res = await updateQuestion(parsed.data.id, parsed.data.question);
    if (!res.ok) return res;
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteQuestionAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown question" };
  try {
    await deleteQuestion(parsed.data.id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Step one of an import: read the page and show what was found. Nothing is saved. */
export async function previewImportAction(input: unknown): Promise<ActionResult<{ url: string; candidates: Candidate[] }>> {
  await requireSession();
  const parsed = z.object({ url: z.string().min(8).max(2000), company: z.string().trim().max(60).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paste the address of a public page" };
  try {
    const res = await previewImport(parsed.data.url, parsed.data.company || undefined);
    return res.ok ? { ok: true, url: res.url, candidates: res.candidates } : res;
  } catch (err) {
    return fail(err);
  }
}

/** Step two: save the questions you ticked. */
export async function saveImportedAction(input: unknown): Promise<ActionResult<{ added: number; skipped: number }>> {
  await requireSession();
  const parsed = z.object({ url: z.string().min(8).max(2000), items: z.array(extractedItemSchema).min(1).max(30) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Select at least one question" };
  try {
    const res = await saveImported(parsed.data.url, parsed.data.items);
    if (!res.ok) return res;
    refresh();
    return { ok: true, added: res.added, skipped: res.skipped };
  } catch (err) {
    return fail(err);
  }
}

export async function draftForCompanyAction(input: unknown): Promise<ActionResult<{ added: number }>> {
  await requireSession();
  const parsed = z.object({ company: z.string().trim().min(2).max(60), category: z.enum(CATEGORIES), count: z.number().int().min(1).max(8).default(5) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a company and pick a category" };
  try {
    const res = await draftForCompany(parsed.data.company, parsed.data.category, parsed.data.count);
    if (!res.ok) return res;
    refresh();
    return { ok: true, added: res.added };
  } catch (err) {
    return fail(err);
  }
}
