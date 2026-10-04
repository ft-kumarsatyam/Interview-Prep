"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CalendarPlus, Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { pullBacklogAction, unpullBacklogAction } from "@/app/(app)/backlog/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { minutesLabel } from "@/modules/progress/domain/backlog-items";

export interface DayBacklogItem {
  key: string;
  title: string;
  path: string;
  minutes: number;
}

/** Backlog items placed on one day, and a short list to add from. The day is fixed, so there is nothing to pick. */
export function DayBacklog({ date, dayLabel, queued, done, available, canAdd }: { date: string; dayLabel: string; queued: DayBacklogItem[]; done: number; available: DayBacklogItem[]; canAdd: boolean }) {
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(`${res.error ?? "Something went wrong"}.`);
      else toast.success(ok);
    });
  if (queued.length === 0 && done === 0 && (!canAdd || available.length === 0)) return null;
  const queuedMinutes = queued.reduce((s, i) => s + i.minutes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="size-4 text-muted-foreground" aria-hidden /> Backlog for this day
        </CardTitle>
        <CardDescription>
          {queued.length + done === 0 ? "Nothing placed here yet." : `${queued.length} to do (${minutesLabel(queuedMinutes)})${done ? `, ${done} done` : ""}.`} Optional and never part of the streak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {queued.length > 0 && (
          <ul className="divide-y">
            {queued.map((i) => (
              <li key={i.key} className="flex items-center gap-2">
                <Link href={i.path} className="min-h-11 min-w-0 flex-1 truncate py-2.5 text-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  {i.title}
                </Link>
                {canAdd && (
                  <Button size="icon-sm" variant="ghost" disabled={pending} aria-label={`Remove ${i.title} from ${dayLabel}`} onClick={() => act(() => unpullBacklogAction({ key: i.key, date }), `Removed from ${dayLabel}`)}>
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canAdd && available.length > 0 && (
          <details className="group">
            <summary className="min-h-9 cursor-pointer text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Add from your backlog ({available.length})</summary>
            <ul className="mt-2 divide-y">
              {available.map((i) => (
                <li key={i.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate py-2 text-sm">
                    {i.title} <span className="text-xs text-muted-foreground">· {minutesLabel(i.minutes)}</span>
                  </span>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => pullBacklogAction({ key: i.key, date }), `Planned for ${dayLabel}`)}>
                    <CalendarPlus /> Add
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3" aria-hidden /> The day&apos;s hours stay as planned; add only what fits.
            </p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
