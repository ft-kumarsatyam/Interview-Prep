import { connectDb } from "@/core/db";
import { SubtopicProgress } from "@/core/models/progress";

export interface SubtopicProgressSummary {
  doneOn: string;
  notes: string;
  confidence: number | null;
}

export async function getSubtopicProgressMap(): Promise<Record<string, SubtopicProgressSummary>> {
  await connectDb();
  const rows = await SubtopicProgress.find({}, { subtopicId: 1, doneOn: 1, notes: 1, confidence: 1 }).lean();
  return Object.fromEntries(
    rows.map((r) => [r.subtopicId, { doneOn: r.doneOn, notes: r.notes ?? "", confidence: r.confidence ?? null }]),
  );
}
