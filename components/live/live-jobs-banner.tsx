"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLiveEvents, useLiveStatus } from "@/components/live/live-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** On the Discover list: a job refresh in progress, and a one-tap way to see what it found without losing your place. */
export function LiveJobsBanner() {
  const router = useRouter();
  const status = useLiveStatus();
  const [fresh, setFresh] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useLiveEvents((e) => {
    if (e.type === "sync.progress") setProgress({ done: e.done, total: e.total });
    else if (e.type === "sync.done") setProgress(null);
    else if (e.type === "jobs.new") setFresh((n) => n + e.count);
  }, ["sync.progress", "sync.done", "jobs.new"]);

  return (
    <div aria-live="polite" className="space-y-2">
      {progress && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm" role="status">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-hidden />
          <span className="shrink-0">
            Reading career pages: {progress.done} of {progress.total}
          </span>
          <Progress value={progress.total ? (100 * progress.done) / progress.total : 0} aria-label="Refresh progress" className="h-1.5" />
        </div>
      )}
      {fresh > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
          <span className="font-medium">
            {fresh} new job{fresh === 1 ? "" : "s"} just arrived
          </span>
          <Button
            size="sm"
            onClick={() => {
              setFresh(0);
              router.refresh();
            }}
          >
            Show them
          </Button>
        </div>
      )}
      {status === "polling" && <p className="text-xs text-muted-foreground">Live updates are unavailable, so this page refreshes itself every minute.</p>}
    </div>
  );
}
