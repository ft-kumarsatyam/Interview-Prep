"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { getLlm } from "@/lib/llm";
import { runMorning } from "@/lib/services/cron";

export async function runMorningAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const res = await runMorning();
  refresh();
  const failed = (["news", "plan", "leetcode"] as const).filter((k) => !res[k].ok);
  return failed.length
    ? { ok: false, error: `Ran, but ${failed.join(" and ")} failed` }
    : { ok: true, message: "Morning job ran: news refreshed, plan built, LeetCode synced" };
}

const probeSchema = z.object({ question: z.string().min(5).max(300), answer: z.string().min(1).max(200) });

export async function testLlmAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const llm = getLlm();
  if (!llm) return { ok: false, error: "LLM_API_KEY isn't set" };
  try {
    const res = await llm.generateJson(
      'Write one short interview question about JavaScript closures and its one-line answer. Reply with JSON only: {"question": "...", "answer": "..."}',
      probeSchema,
    );
    return { ok: true, message: `${llm.name} replied: "${res.question.slice(0, 120)}"` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "LLM call failed" };
  }
}
