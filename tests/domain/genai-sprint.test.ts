import { describe, expect, it } from "vitest";
import { genaiPrepPlan } from "@/core/genai-prep-pack";
import { blockProgress, nextTask, overallProgress, type SprintProgress } from "@/modules/genai-sprint/domain/sprint";

const empty: SprintProgress = { completed: {}, pinnedBlockId: null };

describe("genai-sprint domain", () => {
  it("picks the first incomplete task in block order", () => {
    const first = genaiPrepPlan.blocks[0]!.days[0]!.tasks[0]!;
    expect(nextTask(genaiPrepPlan, empty)?.id).toBe(first.id);
  });

  it("skips completed tasks", () => {
    const first = genaiPrepPlan.blocks[0]!.days[0]!.tasks[0]!;
    const second = genaiPrepPlan.blocks[0]!.days[0]!.tasks[1]!;
    const progress: SprintProgress = { completed: { [first.id]: "2026-10-23" }, pinnedBlockId: null };
    expect(nextTask(genaiPrepPlan, progress)?.id).toBe(second.id);
  });

  it("respects pinned block before other blocks", () => {
    const w1 = genaiPrepPlan.blocks.find((b) => b.id === "w1")!;
    const w1First = w1.days[0]!.tasks[0]!;
    const progress: SprintProgress = { completed: {}, pinnedBlockId: "w1" };
    expect(nextTask(genaiPrepPlan, progress)?.id).toBe(w1First.id);
  });

  it("computes block and overall hours", () => {
    const block = genaiPrepPlan.blocks[0]!;
    const task = block.days[0]!.tasks[0]!;
    const progress: SprintProgress = { completed: { [task.id]: "2026-10-23" }, pinnedBlockId: null };
    const bp = blockProgress(block, progress);
    expect(bp.done).toBe(1);
    expect(bp.hoursDone).toBe(task.hours);
    const all = overallProgress(genaiPrepPlan, progress);
    expect(all.done).toBe(1);
    expect(all.pct).toBeGreaterThan(0);
  });
});
