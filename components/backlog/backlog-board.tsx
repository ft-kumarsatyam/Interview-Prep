"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ArchiveRestore, BellOff, CalendarPlus, Check, Clock, MoreHorizontal, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import {
  dismissBacklogAction,
  pullBacklogAction,
  restoreBacklogAction,
  restoreDismissedAction,
  setBacklogBudgetAction,
  snoozeBacklogAction,
  unpullBacklogAction,
} from "@/app/(app)/backlog/actions";
import { Chip } from "@/components/shared/chip";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BACKLOG_KIND_INFO, minutesLabel, type BacklogKind } from "@/lib/domain/backlog-items";

export interface BoardItem {
  key: string;
  kind: BacklogKind;
  title: string;
  note?: string;
  path: string;
  minutes: number;
  /** Days it has been owed, when known. */
  ageDays: number | null;
}

const KIND_TONE: Record<BacklogKind, Tone> = { review: "info", company: "primary", theory: "neutral", dsa: "neutral", quiz: "warning", design: "neutral", mock: "warning", reading: "neutral" };

function useAct() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(`${res.error ?? "Something went wrong"}. Try again.`);
      else if (success) toast.success(success);
    });
  return { pending, run };
}

function Row({ item, queued, snoozed }: { item: BoardItem; queued: boolean; snoozed?: boolean }) {
  const { pending, run } = useAct();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-card px-3 py-2 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <Link href={item.path} className="line-clamp-2 text-sm font-medium hover:underline sm:line-clamp-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {item.title}
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <ToneBadge tone={KIND_TONE[item.kind]}>{BACKLOG_KIND_INFO[item.kind].label}</ToneBadge>
          {item.note && <span className="truncate">{item.note}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {minutesLabel(item.minutes)}
          </span>
          {item.ageDays !== null && item.ageDays > 0 && <span>owed {item.ageDays} day{item.ageDays === 1 ? "" : "s"}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {snoozed ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => restoreBacklogAction(item.key), "Back in your backlog")}>
            <Undo2 /> Bring back
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant={queued ? "secondary" : "outline"}
              disabled={pending}
              onClick={() => run(() => (queued ? unpullBacklogAction(item.key) : pullBacklogAction(item.key)), queued ? "Removed from today" : "Added to today")}
              aria-pressed={queued}
            >
              {queued ? <Check /> : <CalendarPlus />} {queued ? "In today" : "Add to today"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${item.title}`} disabled={pending}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => run(() => snoozeBacklogAction({ key: item.key, days: 1 }), "Snoozed until tomorrow")}>
                  <BellOff /> Snooze 1 day
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run(() => snoozeBacklogAction({ key: item.key, days: 3 }), "Snoozed for 3 days")}>
                  <BellOff /> Snooze 3 days
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run(() => snoozeBacklogAction({ key: item.key, days: 7 }), "Snoozed for a week")}>
                  <BellOff /> Snooze 1 week
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => run(() => dismissBacklogAction(item.key), "Dismissed. Restore it from the bottom of this page.")}>
                  <X /> Dismiss for good
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </li>
  );
}

function BudgetControl({ budget }: { budget: number }) {
  const [value, setOptimistic] = useOptimistic(budget);
  const { run } = useAct();
  return (
    <div role="group" aria-label="Backlog items queued each day" className="flex flex-wrap items-center gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <Chip
          key={n}
          pressed={value === n}
          onClick={() =>
            run(async () => {
              setOptimistic(n);
              return setBacklogBudgetAction(n);
            }, n === 0 ? "Automatic queue off" : `Queueing ${n} a day`)
          }
        >
          {n === 0 ? "Off" : n}
        </Chip>
      ))}
    </div>
  );
}

export function BacklogBoard({
  items,
  queue,
  snoozed,
  kinds,
  dismissedCount,
  budget,
  queueDone,
}: {
  items: BoardItem[];
  queue: BoardItem[];
  snoozed: BoardItem[];
  kinds: Array<{ kind: BacklogKind; count: number }>;
  dismissedCount: number;
  budget: number;
  queueDone: number;
}) {
  const [filter, setFilter] = useState<BacklogKind | "all">("all");
  const { pending, run } = useAct();
  const queued = new Set(queue.map((q) => q.key));
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s backlog queue</CardTitle>
          <CardDescription>
            Each morning PrepOS queues {budget === 0 ? "nothing (the automatic queue is off)" : `${budget} of the most useful items`}. They are optional and never affect your streak.
            {queueDone > 0 && ` ${queueDone} finished today.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queue.length > 0 ? (
            <ul className="space-y-2">
              {queue.map((i) => (
                <Row key={i.key} item={i} queued />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{queueDone > 0 ? "Everything queued for today is done. Nice." : "Nothing queued for today. Add an item below."}</p>
          )}
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-sm font-medium">Items queued each day</p>
            <BudgetControl budget={budget} />
          </div>
        </CardContent>
      </Card>

      <section aria-label="Everything you owe" className="space-y-3">
        <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-1.5">
          <Chip pressed={filter === "all"} onClick={() => setFilter("all")} count={items.length}>
            All
          </Chip>
          {kinds.map((k) => (
            <Chip key={k.kind} pressed={filter === k.kind} onClick={() => setFilter(k.kind)} count={k.count}>
              {BACKLOG_KIND_INFO[k.kind].label}
            </Chip>
          ))}
        </div>
        {shown.length > 0 ? (
          <ul className="space-y-2">
            {shown.map((i) => (
              <Row key={i.key} item={i} queued={queued.has(i.key)} />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing owed here. Keep it that way.</p>
        )}
      </section>

      {(snoozed.length > 0 || dismissedCount > 0) && (
        <section aria-label="Hidden items" className="space-y-2 border-t pt-4">
          {snoozed.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Snoozed ({snoozed.length})</summary>
              <ul className="mt-2 space-y-2">
                {snoozed.map((i) => (
                  <Row key={i.key} item={i} queued={false} snoozed />
                ))}
              </ul>
            </details>
          )}
          {dismissedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{dismissedCount} dismissed item{dismissedCount === 1 ? "" : "s"}.</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(async () => restoreDismissedAction(), "Dismissed items restored")}>
                <ArchiveRestore /> Restore all
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
