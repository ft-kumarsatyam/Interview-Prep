"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshJobsAction } from "@/app/(app)/jobs/discover-actions";
import { Button } from "@/components/ui/button";

/** Reads whichever sources are due right now (about a minute at most). New jobs then appear in the list. */
export function RefreshButton({ ids, label = "Refresh" }: { ids?: string[]; label?: string }) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const res = await refreshJobsAction({ ids });
      if (!res.ok) return void toast.error(`${res.error}.`);
      const s = res.summary;
      if (s.status === "skipped") return void toast.message("A refresh is already running. Give it a minute.");
      const parts = [`${s.ok + s.unchanged} read`, `${s.added} new job${s.added === 1 ? "" : "s"}`];
      if (s.failed) parts.push(`${s.failed} failed`);
      if (s.remaining) parts.push(`${s.remaining} more will follow on the next run`);
      toast.success(parts.join(", "));
    });
  return (
    <Button variant="outline" onClick={run} loading={pending}>
      {!pending && <RefreshCw />} {pending ? "Reading career pages…" : label}
    </Button>
  );
}
