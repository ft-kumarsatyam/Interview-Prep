import { Check, Circle, Lock } from "lucide-react";
import type { LearningStageView } from "@/modules/learn/domain/learning-flow";

const ICON = { complete: Check, current: Circle, locked: Lock } as const;

export function LearningPath({ stages }: { stages: readonly LearningStageView[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5" aria-label="Learning path">
      {stages.map((stage) => {
        const Icon = ICON[stage.status];
        return (
          <li key={stage.id} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="size-4 text-primary" aria-hidden />
              {stage.title}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
