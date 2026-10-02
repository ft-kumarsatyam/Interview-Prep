"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleSubtopic } from "@/app/(app)/dashboard/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
  meta?: string;
}

export function SubtopicChecklist({
  items,
  renderExtra,
}: {
  items: ChecklistItem[];
  renderExtra?: (item: ChecklistItem & { done: boolean }) => React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  const [done, flip] = useOptimistic(
    new Set(items.filter((i) => i.done).map((i) => i.id)),
    (state: Set<string>, id: string) => {
      const next = new Set(state);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    },
  );

  function onToggle(id: string) {
    startTransition(async () => {
      flip(id);
      const res = await toggleSubtopic(id);
      if (!res.ok) toast.error(`${res.error}. Try ticking it again.`);
      else if (res.justCompleted) await celebrateDayComplete();
    });
  }

  return (
    <ul className="space-y-1" aria-live="polite">
      {items.map((item) => {
        const checked = done.has(item.id);
        return (
          <li key={item.id} className="rounded-lg px-2 py-1.5 hover:bg-muted/50">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(item.id)} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm transition-opacity", checked && "text-muted-foreground line-through opacity-70")}>
                  {item.title}
                </span>
                {item.meta && <span className="block text-xs text-muted-foreground">{item.meta}</span>}
              </span>
            </label>
            {renderExtra?.({ ...item, done: checked })}
          </li>
        );
      })}
    </ul>
  );
}
