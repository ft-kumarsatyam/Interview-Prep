"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { settingsInputSchema, type SettingsInput } from "@/lib/domain/settings";
import { seedContent } from "@/lib/services/seed";
import { saveSettings, setRoastMode } from "@/lib/services/settings";
import { sendTestMail } from "@/lib/services/test-mail";

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

const testMailKind = z.enum(["ping", "morning", "evening"]);

export async function testNotificationAction(
  kind: unknown = "ping",
): Promise<ActionResult<{ sent: string[]; failed: string[]; errors: Record<string, string>; subject: string; sample: boolean; to: string | null }>> {
  await requireSession();
  const parsed = testMailKind.safeParse(kind);
  if (!parsed.success) return { ok: false, error: "Unknown test type" };
  try {
    const res = await sendTestMail(parsed.data);
    if (!res) return { ok: false, error: "No channel configured. Set the Telegram, WhatsApp, Brevo or Resend env vars first" };
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sending failed" };
  }
}

export async function setRoastModeAction(on: unknown): Promise<ActionResult<{ roastMode: boolean }>> {
  await requireSession();
  const parsed = z.boolean().safeParse(on);
  if (!parsed.success) return { ok: false, error: "Expected on or off" };
  await setRoastMode(parsed.data);
  refresh();
  return { ok: true, roastMode: parsed.data };
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
