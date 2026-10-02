"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/dal";
import { isDateStr } from "@/lib/domain/dates";
import { syncLeetCode } from "@/lib/services/leetcode-sync";
import { REPLAN_MAX_HOURS, REPLAN_MIN_HOURS, replanToday, todayIn } from "@/lib/services/plan";
import { recordSolve, saveProblemNotes, saveSubtopicNotes, toggleSubtopic as toggle } from "@/lib/services/progress";
import { getSettings } from "@/lib/services/settings";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const solveSchema = z.object({
  slug: z.string().min(1).max(120),
  confidence: z.enum(["easy", "ok", "struggled"]),
  timeTakenMin: z.coerce.number().int().min(0).max(600).optional(),
  approach: z.string().trim().max(300).optional(),
  timeComplexity: z.string().trim().max(40).optional(),
  spaceComplexity: z.string().trim().max(40).optional(),
  /** Only for filling in details of an earlier (e.g. LeetCode-synced) solve. */
  date: z.string().refine(isDateStr).optional(),
});

export type SolveFormInput = z.input<typeof solveSchema>;

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong, try again" };
}

export async function markSolved(input: SolveFormInput): Promise<ActionResult<{ justCompleted: boolean }>> {
  await requireSession();
  const parsed = solveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const { slug, date, ...details } = parsed.data;
    const today = todayIn(await getSettings());
    if (date && date > today) return { ok: false, error: "That date is in the future" };
    const { justCompleted } = await recordSolve({ slug, date: date ?? today, source: "manual", details });
    refresh();
    return { ok: true, justCompleted };
  } catch (err) {
    return fail(err);
  }
}

const idSchema = z.string().regex(/^[\w-]+:\d+$/);

export async function toggleSubtopic(id: string): Promise<ActionResult<{ done: boolean; justCompleted: boolean }>> {
  await requireSession();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid subtopic" };
  try {
    const today = todayIn(await getSettings());
    const { done, justCompleted } = await toggle(parsed.data, today);
    refresh();
    return { ok: true, done, justCompleted };
  } catch (err) {
    return fail(err);
  }
}

export async function syncLeetCodeNow(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const res = await syncLeetCode({ force: true });
  refresh();
  switch (res.status) {
    case "disabled":
      return { ok: false, error: "Add your LeetCode username in Settings first" };
    case "error":
      return { ok: false, error: res.message };
    case "throttled":
      return { ok: true, message: "A sync is already running" };
    case "ok":
      return {
        ok: true,
        message: res.imported ? `Imported ${res.imported} new solve${res.imported === 1 ? "" : "s"}` : "Up to date: no new accepted submissions",
      };
  }
}

const notesSchema = z.object({ slug: z.string().min(1).max(120), notes: z.string().max(20_000) });

export async function updateProblemNotes(input: z.input<typeof notesSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Notes are too long" };
  try {
    await saveProblemNotes(parsed.data.slug, parsed.data.notes);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const subNotesSchema = z.object({
  id: idSchema,
  notes: z.string().max(20_000),
  confidence: z.number().int().min(1).max(5).optional(),
});

export async function updateSubtopicNotes(input: z.input<typeof subNotesSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = subNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notes" };
  try {
    await saveSubtopicNotes(parsed.data.id, parsed.data.notes, parsed.data.confidence);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const replanSchema = z.object({ hours: z.coerce.number().min(REPLAN_MIN_HOURS).max(REPLAN_MAX_HOURS) });

/** "I have N hours today": re-plan today's targets from that budget. */
export async function replanTodayAction(input: z.input<typeof replanSchema>): Promise<ActionResult<{ dsaTarget: number; theoryTarget: number }>> {
  await requireSession();
  const parsed = replanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Pick between ${REPLAN_MIN_HOURS} and ${REPLAN_MAX_HOURS} hours` };
  try {
    const plan = await replanToday(parsed.data.hours);
    refresh();
    return { ok: true, dsaTarget: plan.dsaTarget, theoryTarget: plan.theoryTarget };
  } catch (err) {
    return fail(err);
  }
}
