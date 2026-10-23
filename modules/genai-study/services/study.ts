import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { loadNodeStudy } from "@/core/genai-study";
import { GenaiStudyProgress } from "@/core/models/genai-study";
import type { StudyStatus } from "@/modules/genai-study/domain/study";

/** Sub-topic key -> status for one node. Sub-topics with no row are new. */
export async function getNodeStudyStatus(roadmapId: string, nodeId: string): Promise<Map<string, StudyStatus>> {
  await connectDb();
  const rows = await GenaiStudyProgress.find({ roadmapId, nodeId }, { key: 1, status: 1 }).lean();
  return new Map(rows.map((r) => [r.key, r.status as StudyStatus]));
}

/** Rate one sub-topic. "new" clears the rating. Only keys that have a note can be rated. */
export async function setStudyStatus(roadmapId: string, nodeId: string, key: string, status: StudyStatus, today: DateStr): Promise<void> {
  if (!(await loadNodeStudy(roadmapId, nodeId))?.[key]) throw new Error("Unknown sub-topic");
  await connectDb();
  if (status === "new") {
    await GenaiStudyProgress.deleteOne({ roadmapId, nodeId, key });
    return;
  }
  await GenaiStudyProgress.updateOne({ roadmapId, nodeId, key }, { $set: { status, updatedOn: today } }, { upsert: true });
}
