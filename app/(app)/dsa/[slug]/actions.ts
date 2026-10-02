"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { problemBySlug } from "@/lib/content";
import { checkAccepted, type AcceptedCheck } from "@/lib/services/leetcode-sync";
import { markAttempted, revealHiddenCase } from "@/lib/services/progress";

const slugSchema = z.string().min(1).max(120);

/** Marks a problem "attempted" after a Run or a Submit that didn't pass everything. */
export async function markAttemptedAction(slug: string): Promise<ActionResult> {
  await requireSession();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success || !problemBySlug.has(parsed.data)) return { ok: false, error: "Unknown problem" };
  await markAttempted(parsed.data);
  refresh();
  return { ok: true };
}

const checkSchema = z.object({ slug: slugSchema, sinceMs: z.number().int().positive() });

/**
 * After "Copy and open LeetCode": has your Accepted submission landed on your public profile?
 * Imported as a normal LeetCode-synced solve (confidence still to fill in).
 */
export async function checkAcceptedAction(input: z.input<typeof checkSchema>): Promise<ActionResult<{ result: AcceptedCheck }>> {
  await requireSession();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success || !problemBySlug.has(parsed.data.slug)) return { ok: false, error: "Unknown problem" };
  const result = await checkAccepted(parsed.data);
  if (result.status === "accepted") refresh();
  return { ok: true, result };
}

const revealSchema = z.object({ slug: slugSchema, index: z.number().int().min(0).max(500) });

/** After a failed Submit: shows the first failing hidden case, once. It stays visible from then on. */
export async function revealCaseAction(input: z.input<typeof revealSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = revealSchema.safeParse(input);
  if (!parsed.success || !problemBySlug.has(parsed.data.slug)) return { ok: false, error: "Unknown problem" };
  if (!(await revealHiddenCase(parsed.data.slug, parsed.data.index))) return { ok: false, error: "That case isn't hidden" };
  refresh();
  return { ok: true };
}
