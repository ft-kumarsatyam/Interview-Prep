"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { todayIn } from "@/modules/planner/services/plan";
import { joinRoadmap, leaveRoadmap, setChecklistItem, setLinkRead, setNodeManual } from "@/modules/roadmap/services/roadmap";
import { getSettings } from "@/modules/settings/services/settings";

const ids = { roadmapId: z.string().max(60), nodeId: z.string().max(80) };

async function run(fn: () => Promise<void>, fallback: string): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : fallback };
  }
}

export async function joinRoadmapAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ roadmapId: ids.roadmapId, join: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown roadmap" };
  const { roadmapId, join } = parsed.data;
  return run(async () => (join ? joinRoadmap(roadmapId, todayIn(await getSettings())) : leaveRoadmap(roadmapId)), "Couldn't save");
}

export async function setLinkReadAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ ...ids, url: z.string().url().max(500), read: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown link" };
  const { roadmapId, nodeId, url, read } = parsed.data;
  return run(() => setLinkRead(roadmapId, nodeId, url, read), "Couldn't save");
}

export async function setChecklistItemAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ ...ids, index: z.number().int().min(0).max(50), done: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown topic" };
  const { roadmapId, nodeId, index, done } = parsed.data;
  return run(() => setChecklistItem(roadmapId, nodeId, index, done), "Couldn't save");
}

export async function setNodeManualAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.object({ ...ids, done: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown node" };
  const { roadmapId, nodeId, done } = parsed.data;
  return run(async () => setNodeManual(roadmapId, nodeId, done, todayIn(await getSettings())), "Couldn't save");
}
