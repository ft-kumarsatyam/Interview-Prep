import type { Metadata } from "next";
import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { genaiPrepPlan } from "@/core/genai-prep-pack";
import { KindBadge } from "@/modules/genai-sprint/components/kind-badge";
import { PinBlockButton } from "@/modules/genai-sprint/components/pin-block-button";
import { TaskToggle } from "@/modules/genai-sprint/components/task-toggle";
import { blockProgress, isTaskDone } from "@/modules/genai-sprint/domain/sprint";
import { getSprintState } from "@/modules/genai-sprint/services/progress";

export const metadata: Metadata = { title: "GenAI sprint · Plan" };

export default async function GenaiSprintPlanPage() {
  const state = await getSprintState();

  return (
    <div className="space-y-8">
      <PageHeader icon={ListTodo} title="Plan" description="Head start plus six weeks. Tasks keep stable ids (d03t1) for progress." />
      {genaiPrepPlan.blocks.map((block) => {
        const bp = blockProgress(block, state.progress);
        const pinned = state.progress.pinnedBlockId === block.id;
        return (
          <section key={block.id} id={block.id} className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{block.title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{block.goal}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground tabular">
                  {bp.done}/{bp.total} tasks · {bp.hoursDone.toFixed(1)}/{bp.hoursTotal}h
                </p>
              </div>
              <PinBlockButton blockId={block.id} pinned={pinned} />
            </div>
            <ul className="space-y-2">
              {[...block.days]
                .sort((a, b) => a.day_index - b.day_index)
                .flatMap((day) =>
                  day.tasks.map((task) => (
                    <li key={task.id} className="flex gap-3 rounded-md border px-3 py-2">
                      <TaskToggle taskId={task.id} done={isTaskDone(task.id, state.progress)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <KindBadge kind={task.kind} />
                          <span className="font-mono text-[11px] text-muted-foreground tabular">{task.hours}h</span>
                        </div>
                        <p className="mt-1 text-sm">{task.text}</p>
                        {task.done_when && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">Done when:</span> {task.done_when}
                          </p>
                        )}
                      </div>
                    </li>
                  )),
                )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
