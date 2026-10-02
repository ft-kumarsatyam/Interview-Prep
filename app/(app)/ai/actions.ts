"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { approvePaidToday } from "@/lib/services/ai";
import { explainAnswer, type ExplainResult } from "@/lib/services/ai-explain";

/** "Allow the paid AI fallback for the rest of today": removes the confirm prompt until midnight. */
export async function allowPaidTodayAction(): Promise<ActionResult> {
  await requireSession();
  await approvePaidToday();
  return { ok: true };
}

const optsSchema = z.object({ paidOnce: z.boolean().optional() }).optional();

/** "Explain my mistake". Auth and input checks here; the work is in lib/services/ai-explain.ts. */
export async function explainAnswerAction(input: unknown, opts?: unknown): Promise<ExplainResult> {
  await requireSession();
  const options = optsSchema.safeParse(opts);
  if (!options.success) return { ok: false, error: "That request couldn't be understood" };
  return explainAnswer(input, { paidOnce: options.data?.paidOnce });
}
