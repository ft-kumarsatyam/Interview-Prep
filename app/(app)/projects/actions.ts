"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import { addProjectToSavedResume, saveProjectMeta, setMilestone } from "@/modules/learn/services/webdev";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const fail = (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : "Something went wrong" });

export async function setMilestoneAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ slug, milestoneId: z.string().regex(/^m\d{1,2}$/), ticked: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown milestone" };
  try {
    await setMilestone(parsed.data.slug, parsed.data.milestoneId, parsed.data.ticked, todayIn(await getSettings()));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function saveProjectMetaAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({ slug, repoUrl: z.string().trim().max(300).refine((u) => u === "" || /^https:\/\/[^\s]+$/.test(u), "Use an https link"), notes: z.string().max(3000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  try {
    await saveProjectMeta(parsed.data.slug, { repoUrl: parsed.data.repoUrl, notes: parsed.data.notes }, todayIn(await getSettings()));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addProjectToResumeAction(input: unknown): Promise<ActionResult<{ added: boolean }>> {
  await requireSession();
  const parsed = z.object({ slug }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown project" };
  try {
    const res = await addProjectToSavedResume(parsed.data.slug);
    refresh();
    return { ok: true, ...res };
  } catch (err) {
    return fail(err);
  }
}
