"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { dismissBacklogItem, loadBacklogItems, pullBacklogItem, restoreAllDismissed, restoreBacklogItem, snoozeBacklogItem, unpullBacklogItem } from "@/modules/progress/services/backlog";
import { ensureToday, todayIn } from "@/modules/planner/services/plan";
import { isPullableDay } from "@/modules/planner/domain/pull-days";
import { CARRY_LIMIT_MAX } from "@/modules/planner/domain/carry-limits";
import { getSettings, setBacklogBudget, setCarryLimits } from "@/modules/settings/services/settings";

const key = z.string().min(3).max(200).regex(/^[a-z]+:[A-Za-z0-9:._-]+$/, "Unknown item");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid day");

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

/** Places an item on a day: today by default, or any study day up to the interview date. Rest days and days outside the plan are refused. */
export async function pullBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.union([key.transform((k) => ({ key: k, date: undefined as string | undefined })), z.object({ key, date: date.optional() })]).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  const settings = await getSettings();
  const t = todayIn(settings);
  const target = parsed.data.date ?? t;
  if (!isPullableDay(target, t, settings)) return { ok: false, error: "That day can't take backlog items (it is a rest day, in the past or after the interview)" };
  await pullBacklogItem(parsed.data.key, target);
  refresh();
  return { ok: true };
}

export async function unpullBacklogAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.union([key.transform((k) => ({ key: k, date: undefined as string | undefined })), z.object({ key, date: date.optional() })]).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown item" };
  await unpullBacklogItem(parsed.data.key, parsed.data.date ?? (await today()));
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

const limit = z.number().int().min(1).max(CARRY_LIMIT_MAX);

/** How much unfinished work may be pushed forward before the app warns you. It only warns; it never blocks. */
export async function setCarryLimitsAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ perDay: limit, perWeek: limit, total: limit }).safeParse(input);
  if (!parsed.success) return { ok: false, error: `Use whole numbers from 1 to ${CARRY_LIMIT_MAX}` };
  await setCarryLimits(parsed.data);
  refresh();
  return { ok: true };
}

const OPTIONAL_KINDS = new Set(["reading", "design", "mock"]);

/** The "too much carried over" fix: pause the optional backlog kinds for a week so only core work is owed. */
export async function snoozeOptionalAction(): Promise<ActionResult<{ snoozed: number }>> {
  await requireSession();
  const state = await ensureToday();
  const items = (await loadBacklogItems({ today: state.today, plan: state.plan, settings: state.settings })).filter((i) => OPTIONAL_KINDS.has(i.kind));
  for (const i of items) await snoozeBacklogItem(i.key, 7, state.today);
  refresh();
  return { ok: true, snoozed: items.length };
}
