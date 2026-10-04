"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BookmarkPlus, Check, ExternalLink, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { markPostingAppliedAction, savePostingAction, setDismissedAction } from "@/app/(app)/jobs/discover-actions";
import { setJobStatusAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";

type Target = { kind: "posting"; id: string } | { kind: "job"; id: string };

/**
 * Opens the real application page in a new tab and, when you come back to this tab, asks whether you
 * applied. PrepOS never submits anything for you: it only records what you tell it, with the follow-up date.
 */
export function ApplyPanel({ target, applyUrl, company, savedJobId, applied, dismissed }: { target: Target; applyUrl: string; company: string; savedJobId: string | null; applied: boolean; dismissed?: boolean }) {
  const [pending, start] = useTransition();
  const [jobId, setJobId] = useState(savedJobId);
  const [isApplied, setApplied] = useState(applied);
  const [hidden, setHidden] = useState(Boolean(dismissed));
  const [opened, setOpened] = useState(false);
  const [asking, setAsking] = useState(false);
  const away = useRef(false);

  // Coming back to this tab after opening the application page is the moment to ask.
  useEffect(() => {
    if (!opened) return;
    const onVisible = () => {
      if (document.visibilityState === "hidden") away.current = true;
      else if (away.current) {
        away.current = false;
        setAsking(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [opened]);

  const open = () => {
    window.open(applyUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
  };

  const markApplied = () =>
    start(async () => {
      const res = target.kind === "posting" ? await markPostingAppliedAction({ id: target.id }) : await setJobStatusAction({ id: target.id, status: "applied" }).then((r) => (r.ok ? { ok: true as const, jobId: target.id } : r));
      if (!res.ok) return void toast.error(`${res.error}.`);
      setJobId(res.jobId);
      setApplied(true);
      setAsking(false);
      toast.success("Marked as applied. A follow-up reminder is set for next week.");
    });

  const save = () =>
    start(async () => {
      if (target.kind !== "posting") return;
      const res = await savePostingAction({ id: target.id });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setJobId(res.jobId);
      toast.success(res.duplicate ? "Already in your tracker" : "Saved to your tracker");
    });

  const hide = () =>
    start(async () => {
      if (target.kind !== "posting") return;
      const res = await setDismissedAction({ id: target.id, dismissed: !hidden });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setHidden(!hidden);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={open}>
          <ExternalLink /> Apply on {company}
        </Button>
        {target.kind === "posting" && !jobId && (
          <Button variant="outline" onClick={save} disabled={pending}>
            <BookmarkPlus /> Save to tracker
          </Button>
        )}
        {jobId && (
          <Button variant="outline" asChild>
            <Link href={`/jobs/${jobId}`}>In your tracker</Link>
          </Button>
        )}
        {target.kind === "posting" && (
          <Button variant="ghost" onClick={hide} disabled={pending}>
            <EyeOff /> {hidden ? "Show again" : "Hide"}
          </Button>
        )}
        {isApplied && (
          <span className="inline-flex items-center gap-1 self-center text-sm font-medium text-success" role="status">
            <Check className="size-4" aria-hidden /> Applied
          </span>
        )}
      </div>
      {asking && !isApplied && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span className="font-medium">Did you apply to {company}?</span>
          <Button size="sm" onClick={markApplied} loading={pending}>
            Yes, mark applied
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAsking(false)} disabled={pending}>
            Not yet
          </Button>
        </div>
      )}
      {!isApplied && !asking && opened && <p className="text-xs text-muted-foreground">When you finish on their site, come back here and PrepOS will ask whether to mark it applied.</p>}
    </div>
  );
}
