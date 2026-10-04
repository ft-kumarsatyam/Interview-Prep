"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { plannerInputSchema } from "@/modules/planner/domain/planner-profile";
import { addWeeklyHours, extendEndDate } from "@/modules/planner/domain/replan";
import { DEFAULT_HOURS } from "@/modules/planner/domain/time-budget";
import { getSettings } from "@/modules/settings/services/settings";
import { STUDY_KINDS } from "@/modules/planner/domain/study";
import { resetOptionsSchema } from "@/modules/planner/domain/planner-snapshot";
import { applyPause } from "@/modules/planner/services/pause";
import { savePlanner } from "@/modules/planner/services/planner";
import { resetPlanner, restoreSnapshot, takeSnapshot } from "@/modules/planner/services/planner-snapshot";
import { deleteStudySession, logStudySession } from "@/modules/planner/services/study";

export async function savePlannerAction(input: unknown): Promise<ActionResult<{ changes: number }> | { ok: false; error: string; fields: Record<string, string> }> {
  await requireSession();
  const parsed = plannerInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return { ok: false, error: "Some fields need fixing", fields };
  }
  try {
    const { changes } = await savePlanner(parsed.data);
    refresh();
    return { ok: true, changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save", fields: {} };
  }
}

const studySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(720),
  kind: z.enum(STUDY_KINDS),
  note: z.string().trim().max(200).optional(),
  source: z.enum(["timer", "manual"]),
});

export async function logStudyAction(input: z.input<typeof studySchema>): Promise<ActionResult<{ minutes: number }>> {
  await requireSession();
  const parsed = studySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter 1 to 720 minutes" };
  const saved = await logStudySession(parsed.data);
  refresh();
  return { ok: true, minutes: saved.minutes };
}

export async function deleteStudyAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: "Unknown session" };
  await deleteStudySession(id);
  refresh();
  return { ok: true };
}

const remedySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("extend-date"), weeks: z.number().int().min(1).max(26) }),
  z.object({ kind: z.literal("add-hours"), hoursPerWeek: z.number().min(0.5).max(40) }),
]);

/** Applies one feasibility remedy to the saved planner inputs. Every change is logged like any other plan edit. */
export async function applyRemedyAction(input: unknown): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const parsed = remedySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown fix" };
  const s = await getSettings();
  const hours = s.hoursByDow?.length === 7 ? [...s.hoursByDow] : [...DEFAULT_HOURS];
  const base = { ...s.profile, endDate: s.endDate, hoursByDow: hours };
  const next =
    parsed.data.kind === "extend-date"
      ? { ...base, endDate: extendEndDate(s.endDate, parsed.data.weeks) }
      : { ...base, hoursByDow: addWeeklyHours(hours, parsed.data.hoursPerWeek) };
  const checked = plannerInputSchema.safeParse(next);
  if (!checked.success) return { ok: false, error: checked.error.issues[0]?.message ?? "That change isn't valid" };
  try {
    await savePlanner(checked.data);
    refresh();
    return { ok: true, message: parsed.data.kind === "extend-date" ? `Interview date moved to ${checked.data.endDate}.` : `Added ${parsed.data.hoursPerWeek} hours a week.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" };
  }
}

/** Saves a copy of the current planner, then clears the setup answers. Progress is never touched. */
export async function resetPlannerAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = resetOptionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown reset option" };
  try {
    await resetPlanner(parsed.data);
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reset the planner" };
  }
}

export async function restorePlannerAction(id: unknown): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const parsed = z.string().regex(/^[a-f0-9]{24}$/).safeParse(id);
  if (!parsed.success) return { ok: false, error: "That saved plan doesn't exist" };
  try {
    const r = await restoreSnapshot(parsed.data);
    refresh();
    return { ok: true, message: r.keptCurrentEnd ? `Plan restored. Its interview date had passed, so ${r.endDate} was kept.` : "Plan restored." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not restore that plan" };
  }
}

export async function savePlannerCopyAction(): Promise<ActionResult> {
  await requireSession();
  try {
    await takeSnapshot("manual");
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save a copy" };
  }
}

const pauseSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("rest-of-week") }),
  z.object({ mode: z.literal("days"), count: z.number().int().min(1).max(14) }),
  z.object({ mode: z.literal("resume") }),
]);

export interface PauseActionData {
  added: number;
  removed: number;
  capped: boolean;
  status: "on-track" | "tight" | "at-risk";
}

/** Pause or resume future days. Built on rest days: today and earlier never change, and the change is logged. */
export async function pauseAction(input: unknown): Promise<ActionResult<PauseActionData>> {
  await requireSession();
  const parsed = pauseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown pause option" };
  try {
    const r = await applyPause(parsed.data);
    refresh();
    return { ok: true, added: r.added.length, removed: r.removed.length, capped: r.capped, status: r.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" };
  }
}
