/**
 * GenAI 45-day sprint: task ordering and progress maths. Separate from the syllabus plan. Pure.
 */
import type { PackBlock, PackPlan, PackTask } from "@/modules/genai-prep/domain/schemas";

export type SprintProgress = {
  /** taskId → completion date YYYY-MM-DD */
  completed: Readonly<Record<string, string>>;
  /** When set, next task is chosen within this block first. */
  pinnedBlockId: string | null;
};

export const TASK_KIND_LABEL: Record<PackTask["kind"], string> = {
  setup: "Setup",
  dsa: "DSA",
  learn: "Learn",
  build: "Build",
  drill: "Drill",
  review: "Review",
};

export function flatTasks(plan: PackPlan): PackTask[] {
  const out: PackTask[] = [];
  for (const block of plan.blocks) {
    for (const day of [...block.days].sort((a, b) => a.day_index - b.day_index)) {
      out.push(...day.tasks);
    }
  }
  return out;
}

export function tasksInBlock(block: PackBlock): PackTask[] {
  return [...block.days].sort((a, b) => a.day_index - b.day_index).flatMap((d) => d.tasks);
}

export function isTaskDone(taskId: string, progress: SprintProgress): boolean {
  return taskId in progress.completed;
}

/** First incomplete task in block order, optionally scoped to pinnedBlockId. */
export function nextTask(plan: PackPlan, progress: SprintProgress): PackTask | null {
  const blocks = progress.pinnedBlockId ? plan.blocks.filter((b) => b.id === progress.pinnedBlockId) : plan.blocks;
  for (const block of blocks) {
    for (const task of tasksInBlock(block)) {
      if (!isTaskDone(task.id, progress)) return task;
    }
  }
  if (progress.pinnedBlockId) {
    for (const block of plan.blocks) {
      for (const task of tasksInBlock(block)) {
        if (!isTaskDone(task.id, progress)) return task;
      }
    }
  }
  return null;
}

export function blockProgress(block: PackBlock, progress: SprintProgress): { done: number; total: number; hoursDone: number; hoursTotal: number } {
  const tasks = tasksInBlock(block);
  let done = 0;
  let hoursDone = 0;
  let hoursTotal = 0;
  for (const t of tasks) {
    hoursTotal += t.hours;
    if (isTaskDone(t.id, progress)) {
      done += 1;
      hoursDone += t.hours;
    }
  }
  return { done, total: tasks.length, hoursDone, hoursTotal };
}

export function overallProgress(plan: PackPlan, progress: SprintProgress): { done: number; total: number; hoursDone: number; hoursTotal: number; pct: number } {
  const tasks = flatTasks(plan);
  let done = 0;
  let hoursDone = 0;
  let hoursTotal = 0;
  for (const t of tasks) {
    hoursTotal += t.hours;
    if (isTaskDone(t.id, progress)) {
      done += 1;
      hoursDone += t.hours;
    }
  }
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return { done, total: tasks.length, hoursDone, hoursTotal, pct };
}
