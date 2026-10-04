"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { PRIORITIES, TIER_IDS } from "@/modules/targets/domain/companies";
import { isDateStr } from "@/core/domain/dates";
import { addTarget, removeTarget, setPinned, updateTarget } from "@/modules/targets/services/targets";

const id = z.string().regex(/^[a-f0-9]{24}$/, "Unknown target");
const date = z.string().refine(isDateStr, "Use a real date").nullable();

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
}

export async function addTargetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = z
    .object({
      companyId: z.string().max(60).optional(),
      name: z.string().trim().max(60).optional(),
      tier: z.enum(TIER_IDS).optional(),
      priority: z.enum(PRIORITIES).optional(),
      interviewDate: date.optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  try {
    const t = await addTarget(parsed.data);
    refresh();
    return { ok: true, id: t.id };
  } catch (err) {
    return fail(err);
  }
}

export async function updateTargetAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({ id, tier: z.enum(TIER_IDS).optional(), priority: z.enum(PRIORITIES).optional(), interviewDate: date.optional(), notes: z.string().max(2000).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { id: targetId, ...patch } = parsed.data;
  await updateTarget(targetId, patch);
  refresh();
  return { ok: true };
}

export async function removeTargetAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = id.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown target" };
  await removeTarget(parsed.data);
  refresh();
  return { ok: true };
}

export async function pinAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id, kind: z.enum(["dsa", "design"]), ref: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/), pinned: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  try {
    await setPinned(parsed.data.id, parsed.data.kind, parsed.data.ref, parsed.data.pinned);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
