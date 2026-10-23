"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/core/auth/dal";
import { importSolvedSchema, RUN_KINDS, runInputSchema, savedQueryInputSchema, solvedInputSchema, type RunSummary } from "@/modules/dsa/domain/code-lab";
import { deleteQuery, importSolved, listRuns, markSolved, recordRun, saveQuery } from "@/modules/dsa/services/code-lab";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";
import type { ActionResult } from "../dashboard/actions";

/** Records a finished run (counts and time only). Failures never interrupt the learner. */
export async function recordRunAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = runInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid run" };
  await recordRun(parsed.data, todayIn(await getSettings()));
  return { ok: true };
}

const listRunsSchema = z.object({ kind: z.enum(RUN_KINDS), ref: z.string().trim().min(1).max(120), limit: z.number().int().min(1).max(40).default(10) });

/** The latest finished runs of one problem or scratch buffer, newest first. */
export async function listRunsAction(input: unknown): Promise<ActionResult<{ runs: RunSummary[] }>> {
  await requireSession();
  const parsed = listRunsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown run history" };
  return { ok: true, runs: await listRuns(parsed.data.kind, parsed.data.ref, parsed.data.limit) };
}

export async function saveQueryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = savedQueryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid query" };
  try {
    const id = await saveQuery(parsed.data);
    refresh();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" };
  }
}

export async function deleteQueryAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!z.string().regex(/^[a-f\d]{24}$/i).safeParse(id).success) return { ok: false, error: "Unknown query" };
  await deleteQuery(id);
  refresh();
  return { ok: true };
}

export async function markSolvedAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = solvedInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown challenge" };
  await markSolved(parsed.data.challengeId, parsed.data.mode, todayIn(await getSettings()));
  return { ok: true };
}

export async function importSolvedAction(input: unknown): Promise<ActionResult<{ added: number }>> {
  await requireSession();
  const parsed = importSolvedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid backup" };
  const added = await importSolved(parsed.data.solved, todayIn(await getSettings()));
  refresh();
  return { ok: true, added };
}
