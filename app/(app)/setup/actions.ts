"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { testProviders } from "@/modules/ai/services/ai-test";
import { runMorning } from "@/core/services/cron";
import { replayDead } from "@/core/events/relay";

export async function runMorningAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const res = await runMorning();
  refresh();
  const failed = (["news", "plan", "leetcode"] as const).filter((k) => !res[k].ok);
  return failed.length
    ? { ok: false, error: `Ran, but ${failed.join(" and ")} failed` }
    : { ok: true, message: "Morning job ran: news refreshed, plan built, LeetCode synced" };
}

/** Tests every configured FREE provider (the paid one is never called from here). */
export async function testLlmAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const results = await testProviders({ includePaid: false });
  if (results.length === 0) return { ok: false, error: "No free AI provider is configured (set GEMINI_API_KEY or GROQ_API_KEY)" };
  const message = results.map((r) => `${r.label}: ${r.ok ? "ok" : "failed"}, ${r.detail}`).join(" | ");
  return results.some((r) => r.ok) ? { ok: true, message } : { ok: false, error: message.slice(0, 400) };
}

/** Calls the paid provider once. Costs a small amount and counts toward the daily cap, so it only runs on an explicit click. */
export async function testPaidLlmAction(): Promise<ActionResult<{ message: string }>> {
  await requireSession();
  const [result] = (await testProviders({ includePaid: true })).filter((r) => r.paid);
  if (!result) return { ok: false, error: "The paid provider isn't configured (needs META_LLAMA_API_KEY, META_LLAMA_BASE_URL and META_LLAMA_MODEL)" };
  return result.ok ? { ok: true, message: `${result.label} ${result.detail}` } : { ok: false, error: `${result.label}: ${result.detail}` };
}

/** Puts dead-lettered events back in the outbox; the next relay run (or worker tick) delivers them. */
export async function replayDeadAction(): Promise<ActionResult<{ replayed: number }>> {
  await requireSession();
  const replayed = await replayDead();
  refresh();
  return { ok: true, replayed };
}
