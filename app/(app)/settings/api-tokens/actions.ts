"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { createApiToken, revokeApiToken, type TokenSummary } from "@/core/services/api-tokens";

/** Creates a token. The plaintext comes back once, here; it is not stored and cannot be shown again. */
export async function createTokenAction(input: unknown): Promise<ActionResult<{ token: string; summary: TokenSummary }>> {
  await requireSession();
  const res = await createApiToken(input as Parameters<typeof createApiToken>[0]);
  if (!res.ok) return res;
  refresh();
  return { ok: true, token: res.token, summary: res.summary };
}

export async function revokeTokenAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!(await revokeApiToken(id))) return { ok: false, error: "That token is already revoked or doesn't exist" };
  refresh();
  return { ok: true };
}
