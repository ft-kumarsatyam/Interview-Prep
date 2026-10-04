"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/core/auth/dal";
import { aptitudeTopicById } from "@/modules/aptitude/domain/aptitude/topics";
import { recordAptitudeResults } from "@/modules/aptitude/services/aptitude";

const schema = z.object({
  mode: z.enum(["topic", "mock"]),
  results: z
    .array(
      z.object({
        topic: z.string().refine((id) => aptitudeTopicById.has(id), "Unknown topic"),
        correct: z.boolean(),
        ms: z.number().int().min(0).max(30 * 60_000),
        key: z.string().regex(/^[a-z0-9-]+:[a-z0-9]+$/).max(80).optional(),
      }),
    )
    .min(1)
    .max(60),
});

export async function saveAptitudeSession(input: z.input<typeof schema>): Promise<ActionResult<{ saved: number }>> {
  await requireSession();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid results" };
  try {
    const { saved } = await recordAptitudeResults(parsed.data.results, parsed.data.mode);
    refresh();
    return { ok: true, saved };
  } catch {
    return { ok: false, error: "Could not save your results. Try again." };
  }
}
