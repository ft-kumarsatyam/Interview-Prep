import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { TASK_KIND_LABEL } from "@/modules/genai-playbook/domain/playbook";
import type { PlanTask } from "@/modules/genai-playbook/domain/schemas";
import { PlaybookTaskToggle } from "@/modules/genai-playbook/components/task-toggle";

const TONE: Record<PlanTask["kind"], "primary" | "info" | "success" | "warning" | "neutral"> = { learn: "primary", build: "success", drill: "warning", review: "neutral", dsa: "info" };

export function PlaybookTaskRow({ task, done }: { task: PlanTask; done: boolean }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <PlaybookTaskToggle taskId={task.id} done={done} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ToneBadge tone={TONE[task.kind]}>{TASK_KIND_LABEL[task.kind]}</ToneBadge>
          <span className="font-mono tabular">{task.minutes} min</span>
        </div>
        <p className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{task.text}</p>
        {task.doneWhen && <p className="text-xs text-muted-foreground">Done when: {task.doneWhen}</p>}
        {task.href && (
          <Link href={task.href} className="inline-block text-xs text-primary underline-offset-4 hover:underline">
            Open
          </Link>
        )}
      </div>
    </li>
  );
}
