"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { SETTINGS_SECTION_IDS, mergeSections, settingsInputSchema, type SettingsInput, type SettingsSectionId } from "@/lib/domain/settings";
import { settingsToInput } from "@/lib/services/settings-input";
import { lookupLeetCodeStats } from "@/lib/services/leetcode-sync";
import { seedContent } from "@/lib/services/seed";
import { getSettings, saveSettings, setRoastMode } from "@/lib/services/settings";
import { sendTestMail } from "@/lib/services/test-mail";

const sectionsSchema = z.object({
  sections: z.array(z.enum(SETTINGS_SECTION_IDS as [SettingsSectionId, ...SettingsSectionId[]])).min(1),
  values: z.record(z.string(), z.unknown()),
});

export interface SectionSaveResult {
  saved: SettingsSectionId[];
  failed: Array<{ section: SettingsSectionId; fields: Record<string, string> }>;
  /** The settings as stored after the save. */
  values: SettingsInput;
}

/**
 * Saves each changed section on its own: a section is validated against the stored settings with only
 * its own fields replaced, so an invalid value in one section never blocks another.
 */
export async function saveSettingsSectionsAction(input: unknown): Promise<ActionResult<SectionSaveResult> | { ok: false; error: string }> {
  await requireSession();
  const parsed = sectionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nothing to save" };
  const current = await getSettings();
  const stored = settingsToInput(current);
  let working = stored;
  const saved: SettingsSectionId[] = [];
  const failed: SectionSaveResult["failed"] = [];
  for (const section of parsed.data.sections) {
    // The interview date and weekly hours are edited on the Planner only: whatever the form sent, the stored values stand.
    const merged = { ...mergeSections(working, parsed.data.values, [section]), endDate: stored.endDate, hoursByDow: stored.hoursByDow };
    // The schema reads "" as no username; stored settings hold null.
    const result = settingsInputSchema.safeParse({ ...merged, leetcodeUsername: merged.leetcodeUsername ?? "" });
    if (!result.success) {
      failed.push({ section, fields: Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message])) });
      continue;
    }
    working = result.data;
    saved.push(section);
  }
  if (saved.length > 0) {
    await saveSettings(working);
    refresh();
  }
  const after = saved.length > 0 ? settingsToInput(await getSettings()) : working;
  return { ok: true, saved, failed, values: after };
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

const usernameSchema = z.string().trim().regex(/^[\w-]{1,40}$/, "Letters, digits, _ and - only");

/** Checks a LeetCode username without saving it, so a typo shows up before the first sync. */
export async function testLeetCodeAction(username: unknown): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const parsed = usernameSchema.safeParse(typeof username === "string" ? username.replace(/^@/, "") : "");
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a username first" };
  const { stats, reachable } = await lookupLeetCodeStats(parsed.data, { timeoutMs: 4_000, retries: 0 });
  if (stats) return { ok: true, message: `Found @${parsed.data}: ${stats.solved.All} problems solved.` };
  if (!reachable) return { ok: false, error: "Couldn't reach LeetCode. Try again in a moment." };
  return { ok: false, error: `No public LeetCode profile called "${parsed.data}". Check the spelling and that the profile is public.` };
}
