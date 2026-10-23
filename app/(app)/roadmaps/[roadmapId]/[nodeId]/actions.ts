"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { STUDY_STATUSES } from "@/modules/genai-study/domain/study";
import { setStudyStatus } from "@/modules/genai-study/services/study";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

const input = z.object({
  roadmapId: z.string().max(60),
  nodeId: z.string().max(80),
  key: z.string().max(60),
  status: z.enum(STUDY_STATUSES),
});

export async function setStudyStatusAction(raw: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Unknown sub-topic" };
  const { roadmapId, nodeId, key, status } = parsed.data;
  try {
    await setStudyStatus(roadmapId, nodeId, key, status, todayIn(await getSettings()));
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save" };
  }
}
