"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, RotateCcw, Save, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { resetPlannerAction, restorePlannerAction, savePlannerCopyAction } from "@/app/(app)/plan/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SNAPSHOT_REASON_LABEL, SNAPSHOT_RETENTION_DAYS, type SnapshotReason } from "@/modules/planner/domain/planner-snapshot";

export interface SnapshotRow {
  id: string;
  reason: SnapshotReason;
  takenOnLabel: string;
  summary: string;
  daysLeft: number;
}

const KEPT = ["Solved problems, notes and finished subtopics", "Quiz history, streak and freeze tokens", "Past days in the calendar", "Settings such as rest days and the quiz pass mark"];
const CLEARED = ["Your topic ratings and check scores", "Setup answers: level, focus notes and special periods", "The pending weekly suggestion"];

/** Start the planner over. Saves a copy first, so it can always be undone for 60 days. */
export function ResetPlannerButton({ className, variant = "outline" }: { className?: string; variant?: "outline" | "destructive" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [restart, setRestart] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [pending, start] = useTransition();

  const reset = () =>
    start(async () => {
      const res = await resetPlannerAction({ restartFromToday: restart });
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Planner reset. Your old plan is saved for ${SNAPSHOT_RETENTION_DAYS} days.`);
      setOpen(false);
      router.push("/plan/setup");
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setUnderstood(false);
          setRestart(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size="sm" className={className}>
          <RotateCcw /> Start over
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-warning" aria-hidden /> Start the planner over?
          </DialogTitle>
          <DialogDescription>You&apos;ll go through setup again and the plan is rebuilt from your new answers. Your current plan is saved for {SNAPSHOT_RETENTION_DAYS} days, so you can restore it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="mb-1.5 text-xs font-medium text-success">Kept</p>
            <ul className="space-y-1 text-xs">
              {KEPT.map((k) => (
                <li key={k} className="flex gap-1.5">
                  <Check className="mt-0.5 size-3 shrink-0 text-success" aria-hidden /> {k}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1.5 text-xs font-medium text-destructive">Cleared</p>
            <ul className="space-y-1 text-xs">
              {CLEARED.map((k) => (
                <li key={k} className="flex gap-1.5">
                  <X className="mt-0.5 size-3 shrink-0 text-destructive" aria-hidden /> {k}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={restart} onChange={(e) => setRestart(e.target.checked)} />
          <span>
            <span className="block font-medium">Also restart the plan from today</span>
            <span className="block text-xs text-muted-foreground">Week 1 starts today and the syllabus is spread again up to your interview date. Leave this off to keep your current week.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>I understand my current setup will be cleared.</span>
        </label>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={reset} loading={pending} disabled={!understood}>
            Reset and start setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreButton({ row }: { row: SnapshotRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const restore = () =>
    start(async () => {
      const res = await restorePlannerAction(row.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      router.push("/plan");
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Restore
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore this plan?</DialogTitle>
          <DialogDescription>
            Your ratings, setup answers, hours, interview date and plan start go back to how they were on {row.takenOnLabel}. Your current plan is saved first, so you can switch back. Progress isn&apos;t affected.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg border bg-muted/30 p-3 text-sm text-pretty">{row.summary}</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={restore} loading={pending}>
            Restore this plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Saved planners from the last 60 days, each restorable. */
export function PlanHistory({ rows }: { rows: SnapshotRow[] }) {
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await savePlannerCopyAction();
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Saved. You can restore this plan for ${SNAPSHOT_RETENTION_DAYS} days.`);
    });
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Archive className="mt-0.5 size-4 shrink-0" aria-hidden />
          No saved plans yet. A copy is saved automatically whenever you start over or restore.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r, i) => (
            <li key={r.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.takenOnLabel}</span>
                <span className="flex items-center gap-1.5">
                  {i === 0 && <ToneBadge tone="primary">Latest</ToneBadge>}
                  <ToneBadge tone={r.daysLeft <= 7 ? "warning" : "neutral"}>{r.daysLeft === 0 ? "Expires today" : `${r.daysLeft} days left`}</ToneBadge>
                </span>
              </div>
              <p className="text-xs text-pretty text-muted-foreground">{r.summary}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs text-muted-foreground">{SNAPSHOT_REASON_LABEL[r.reason]}</span>
                <RestoreButton row={r} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={save} loading={pending} className="w-full justify-center sm:w-auto">
        {!pending && <Save />} Save a copy of my current plan
      </Button>
    </div>
  );
}
