"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { jobProfileSchema } from "@/modules/jobs/domain/job-profile";
import { createFromPrefs, deleteProfile, saveProfile } from "@/modules/jobs/services/job-profiles";
import { getJobPrefs } from "@/modules/jobs/services/job-discovery";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown profile");
const fail = (err: unknown) => ({ ok: false as const, error: err instanceof Error ? err.message : "Something went wrong" });

export async function saveProfileAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = z.object({ id: id.nullable(), profile: jobProfileSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the profile" };
  try {
    const saved = await saveProfile(parsed.data.id, parsed.data.profile);
    refresh();
    return { ok: true, id: saved.id };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProfileAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown profile" };
  try {
    await deleteProfile(parsed.data.id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Starts the first profile from the general preferences already saved. */
export async function createProfileFromPrefsAction(): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  try {
    const saved = await createFromPrefs(await getJobPrefs());
    refresh();
    return { ok: true, id: saved.id };
  } catch (err) {
    return fail(err);
  }
}
