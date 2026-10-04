"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { dismissBacklogItem, pullBacklogItem, restoreAllDismissed, restoreBacklogItem, snoozeBacklogItem, unpullBacklogItem } from "@/lib/services/backlog";
import { todayIn } from "@/lib/services/plan";
import { getSettings, setBacklogBudget } from "@/lib/services/settings";

const key = z.string().min(3).max(200).regex(/^[a-z]+:[A-Za-z0-9:._-]+$/, "Unknown item");

async function today() {
  return todayIn(await getSettings());
}

export async function snoozeBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ key, days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick 1 day, 3 days or a week" };
  await snoozeBacklogItem(parsed.data.key, parsed.data.days, await today());
  refresh();
  return { ok: true };
}

export async function dismissBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = key.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  await dismissBacklogItem(parsed.data);
  refresh();
  return { ok: true };
}

export async function restoreBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = key.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  await restoreBacklogItem(parsed.data);
  refresh();
  return { ok: true };
}

export async function restoreDismissedAction(): Promise<ActionResult<{ restored: number }>> {
  await requireSession();
  const restored = await restoreAllDismissed();
  refresh();
  return { ok: true, restored };
}

export async function pullBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = key.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  await pullBacklogItem(parsed.data, await today());
  refresh();
  return { ok: true };
}

export async function unpullBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = key.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  await unpullBacklogItem(parsed.data, await today());
  refresh();
  return { ok: true };
}

export async function setBacklogBudgetAction(n: unknown): Promise<ActionResult<{ budget: number }>> {
  await requireSession();
  const parsed = z.number().int().min(0).max(10).safeParse(n);
  if (!parsed.success) return { ok: false, error: "Pick 0 to 10 items a day" };
  await setBacklogBudget(parsed.data);
  refresh();
  return { ok: true, budget: parsed.data };
}
