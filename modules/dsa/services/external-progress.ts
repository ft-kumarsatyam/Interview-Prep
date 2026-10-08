import { problemBySlug } from "@/core/content";
import { connectDb } from "@/core/db";
import { ExternalProgressModel } from "@/core/models/external-progress";
import type { DateStr } from "@/core/domain/dates";
import { recordSolve } from "@/modules/progress/services/progress";
import { getSettings } from "@/modules/settings/services/settings";
import { todayIn } from "@/modules/planner/services/plan";
import type { ExternalProgress } from "@/modules/dsa/domain/external-catalogue";
import { hubQuestion } from "@/modules/dsa/services/sheet-catalogue";

export async function getExternalProgress(sheetId?: string): Promise<Record<string, ExternalProgress>> {
  await connectDb();
  const rows = await ExternalProgressModel.find(sheetId ? { sheetId } : {}).lean();
  return Object.fromEntries(rows.map((row) => [row.itemId, row.status as ExternalProgress]));
}

export async function completeExternalQuestion(
  itemId: string,
  input: { status: ExternalProgress; date?: DateStr; timeTakenMin?: number; notes?: string; gfgCompleted?: boolean },
): Promise<void> {
  const question = hubQuestion(itemId);
  if (!question) throw new Error("Unknown external question");
  const settings = await getSettings();
  const date = input.date ?? todayIn(settings);
  if (!input.gfgCompleted && question.localSlug && input.status === "completed" && problemBySlug.has(question.localSlug)) {
    await recordSolve({
      slug: question.localSlug,
      date,
      source: "manual",
      details: { confidence: "ok", ...(input.timeTakenMin === undefined ? {} : { timeTakenMin: input.timeTakenMin }), approach: input.notes },
    });
  }
  await connectDb();
  await ExternalProgressModel.updateOne(
    { itemId },
    {
      $set: {
        sheetId: question.sheetId,
        status: input.status,
        completedOn: input.status === "completed" ? date : null,
        ...(input.timeTakenMin === undefined ? {} : { timeTakenMin: input.timeTakenMin }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...(input.gfgCompleted === undefined ? {} : { gfgCompleted: input.gfgCompleted }),
      },
    },
    { upsert: true },
  );
}
