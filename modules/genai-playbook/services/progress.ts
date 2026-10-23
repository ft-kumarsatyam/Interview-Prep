import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { genaiPlaybookPlan } from "@/core/genai-playbook";
import { GenaiPlaybookReview, GenaiPlaybookTask } from "@/core/models/genai-playbook";
import { allTaskIds, type PlaybookCompleted, type PlaybookReview } from "@/modules/genai-playbook/domain/playbook";
import { reviewInputSchema, type ReviewInput } from "@/modules/genai-playbook/domain/schemas";

export interface PlaybookState {
  completed: PlaybookCompleted;
  reviews: PlaybookReview[];
}

export async function getPlaybookState(): Promise<PlaybookState> {
  await connectDb();
  const [tasks, reviews] = await Promise.all([
    GenaiPlaybookTask.find({}, { taskId: 1, completedOn: 1 }).lean(),
    GenaiPlaybookReview.find({}, { kind: 1, weekId: 1, scores: 1, note: 1 }).lean(),
  ]);
  const completed: Record<string, DateStr> = {};
  for (const row of tasks) completed[row.taskId] = row.completedOn;
  return {
    completed,
    reviews: reviews.map((r) => ({ kind: r.kind as PlaybookReview["kind"], weekId: r.weekId, scores: (r.scores ?? {}) as Record<string, number>, note: r.note ?? "" })),
  };
}

export async function setTaskDone(taskId: string, done: boolean, today: DateStr): Promise<void> {
  if (!allTaskIds(genaiPlaybookPlan).has(taskId)) throw new Error("Unknown task");
  await connectDb();
  if (!done) {
    await GenaiPlaybookTask.deleteOne({ taskId });
    return;
  }
  await GenaiPlaybookTask.updateOne({ taskId }, { $set: { completedOn: today } }, { upsert: true });
}

/** Saves (replaces) the review for a kind and week. Input is validated here, not trusted from the caller. */
export async function saveReview(input: ReviewInput): Promise<void> {
  const parsed = reviewInputSchema.parse(input);
  if (!genaiPlaybookPlan.weeks.some((w) => w.id === parsed.weekId)) throw new Error("Unknown week");
  await connectDb();
  await GenaiPlaybookReview.updateOne({ kind: parsed.kind, weekId: parsed.weekId }, { $set: { scores: parsed.scores, note: parsed.note } }, { upsert: true });
}
