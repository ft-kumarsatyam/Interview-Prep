"use client";

import { CircleAlert, Cpu, Loader2 } from "lucide-react";
import type { PgProgress } from "@/core/sandbox/pg-run";

const mb = (n: number) => (n / 1_048_576).toFixed(1);

/** Which engine runs the query, and the first-run download progress of the Postgres engine. */
export function EngineStatus({ engineName, detail, progress, checkNote }: { engineName: string; detail: string; progress: PgProgress | null; checkNote: string | null }) {
  const booting = progress && (progress.stage === "download" || progress.stage === "start");
  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : 0;
  return (
    <div className="shrink-0 border-b bg-muted/10 px-3 py-1 text-2xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="inline-flex items-center gap-1">
          <Cpu className="size-3" aria-hidden /> Runs on <span className="font-medium text-foreground">{engineName}</span> {detail}
        </span>
        {checkNote && <span className="text-warning">{checkNote}</span>}
      </div>
      {booting && (
        <div role="status" className="mt-1 space-y-1">
          <p className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
            {progress.stage === "download" ? `Downloading the Postgres engine, first time only (${mb(progress.loaded)} of ${mb(progress.total)} MB)` : "Starting Postgres…"}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Postgres engine download">
            <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {progress?.stage === "error" && (
        <p role="alert" className="mt-1 flex items-start gap-1.5 text-destructive">
          <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden /> {progress.error ?? "The Postgres engine could not start."}
        </p>
      )}
    </div>
  );
}
