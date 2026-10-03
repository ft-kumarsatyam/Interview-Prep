"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMockAction, gradeMockAction, selfGradeMockAction } from "@/app/(app)/mock/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RUBRIC_MAX, type Criterion, type CriterionScore } from "@/lib/domain/mock";

const SELECT =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Asks the free AI to grade pending written answers once, then falls back to self-review. */
export function GradePanel({ id, pending, aiConfigured }: { id: string; pending: number; aiConfigured: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "grading" | "failed">(aiConfigured && pending > 0 ? "grading" : "idle");
  const [message, setMessage] = useState<string | null>(aiConfigured ? null : "No free AI provider is configured, so score your written answers yourself below.");
  const started = useRef(false);

  const grade = async () => {
    setState("grading");
    const res = await gradeMockAction(id);
    if (res.ok) {
      setState("idle");
      setMessage(res.remaining > 0 ? `${res.remaining} answer${res.remaining === 1 ? "" : "s"} still need a score. Score them yourself below.` : null);
    } else {
      setState("failed");
      setMessage(`${res.error}. Score your written answers yourself below, or try again later.`);
    }
    router.refresh();
  };

  useEffect(() => {
    if (started.current || !aiConfigured || pending === 0) return;
    started.current = true;
    void grade();
    // Runs once per mount; `grade` closes over stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm" role="status">
      {state === "grading" ? (
        <>
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>
            Grading {pending} written answer{pending === 1 ? "" : "s"} against the rubric…
          </span>
        </>
      ) : (
        <>
          <span className="flex-1 text-muted-foreground">{message ?? `${pending} written answer${pending === 1 ? "" : "s"} still need a score.`}</span>
          {aiConfigured && (
            <Button size="sm" variant="outline" onClick={() => void grade()}>
              <Sparkles /> Grade with AI
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** 0–4 per criterion; also used to override an AI grade. */
export function SelfReviewForm({ id, qid, criteria, current }: { id: string; qid: string; criteria: Criterion[]; current?: CriterionScore[] }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, current?.find((s) => s.criterion === c.id)?.score ?? 2])),
  );
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await selfGradeMockAction({ id, qid, scores });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Scores saved");
        router.refresh();
      }
    });

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Score each criterion from 0 (missing) to {RUBRIC_MAX} (interview-ready), using the points above as the bar.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {criteria.map((c) => (
          <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">{c.label}</span>
            <select
              className={SELECT}
              value={scores[c.id]}
              onChange={(e) => setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))}
              aria-label={`${c.label} score`}
            >
              {Array.from({ length: RUBRIC_MAX + 1 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button size="sm" onClick={save} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Save my scores
      </Button>
    </div>
  );
}

export function DeleteMockButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Trash2 /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this mock?</DialogTitle>
          <DialogDescription>Its answers and score are removed from your history. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteMockAction(id);
                if (!res.ok) toast.error(res.error);
                else router.push("/mock");
              })
            }
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
