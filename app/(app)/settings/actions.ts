"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { settingsInputSchema, type SettingsInput } from "@/lib/domain/settings";
import { pushToChannels } from "@/lib/notify";
import { seedContent } from "@/lib/services/seed";
import { saveSettings } from "@/lib/services/settings";

export async function saveSettingsAction(input: unknown): Promise<ActionResult<{ saved: SettingsInput }> | { ok: false; error: string; fields: Record<string, string> }> {
  await requireSession();
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return { ok: false, error: "Some fields need fixing", fields };
  }
  await saveSettings(parsed.data);
  refresh();
  return { ok: true, saved: parsed.data };
}

export async function testNotificationAction(): Promise<ActionResult<{ sent: string[]; failed: string[] }>> {
  await requireSession();
  const res = await pushToChannels("PrepOS test", "Notifications are working. You'll get the evening reminder here when a day is unfinished.");
  if (res.sent.length === 0 && res.failed.length === 0) return { ok: false, error: "No channel configured. Set the Telegram, Brevo or Resend env vars first" };
  return { ok: true, ...res };
}

export async function reseedAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  try {
    const r = await seedContent();
    return { ok: true, message: `Problems: ${r.problems.inserted} new, ${r.problems.updated} updated. Topics: ${r.topics.inserted} new, ${r.topics.updated} updated.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Seeding failed" };
  }
}
