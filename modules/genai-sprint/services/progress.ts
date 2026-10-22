import { flatPackTasks, genaiPrepPlan, packTaskById } from "@/core/genai-prep-pack";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { GenaiSprintPrefs, GenaiSprintTask } from "@/core/models/genai-sprint";
import type { SprintProgress } from "@/modules/genai-sprint/domain/sprint";
import { nextTask, overallProgress } from "@/modules/genai-sprint/domain/sprint";

export interface SprintState {
  progress: SprintProgress;
  next: ReturnType<typeof nextTask>;
  overall: ReturnType<typeof overallProgress>;
}

export async function getSprintState(): Promise<SprintState> {
  await connectDb();
  const [tasks, prefs] = await Promise.all([
    GenaiSprintTask.find({}, { taskId: 1, completedOn: 1 }).lean(),
    GenaiSprintPrefs.findOne({}, { pinnedBlockId: 1 }).lean(),
  ]);
  const completed: Record<string, string> = {};
  for (const row of tasks) completed[row.taskId] = row.completedOn;
  const progress: SprintProgress = {
    completed,
    pinnedBlockId: prefs?.pinnedBlockId ?? null,
  };
  return {
    progress,
    next: nextTask(genaiPrepPlan, progress),
    overall: overallProgress(genaiPrepPlan, progress),
  };
}

export async function setTaskDone(taskId: string, done: boolean, today: DateStr): Promise<void> {
  if (!packTaskById(taskId)) throw new Error("Unknown task");
  await connectDb();
  if (!done) {
    await GenaiSprintTask.deleteOne({ taskId });
    return;
  }
  await GenaiSprintTask.updateOne({ taskId }, { $set: { completedOn: today } }, { upsert: true });
}

export async function setPinnedBlock(blockId: string | null): Promise<void> {
  if (blockId && !genaiPrepPlan.blocks.some((b) => b.id === blockId)) throw new Error("Unknown block");
  await connectDb();
  await GenaiSprintPrefs.updateOne({}, { $set: { pinnedBlockId: blockId } }, { upsert: true });
}

export async function exportSprintProgress(): Promise<SprintProgress> {
  return (await getSprintState()).progress;
}

export async function importSprintProgress(data: SprintProgress, today: DateStr): Promise<void> {
  const valid = new Set(flatPackTasks().map((t) => t.id));
  await connectDb();
  await GenaiSprintTask.deleteMany({});
  const rows = Object.entries(data.completed)
    .filter(([id]) => valid.has(id))
    .map(([taskId, completedOn]) => ({ taskId, completedOn: completedOn || today }));
  if (rows.length) await GenaiSprintTask.insertMany(rows);
  await setPinnedBlock(data.pinnedBlockId);
}
