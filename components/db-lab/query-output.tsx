"use client";

import { CircleAlert, CircleCheck, Database, Loader2, Timer } from "lucide-react";
import type { QueryOutput, QueryVerdict } from "@/lib/sandbox/sql-judge";
import { cn } from "@/lib/utils";
import { ResultTable } from "./result-table";

export function VerdictBanner({ verdict }: { verdict: QueryVerdict }) {
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm", verdict.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10")}>
      {verdict.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />}
      <div className="min-w-0 space-y-0.5">
        <p className={cn("font-semibold", verdict.ok ? "text-success" : "text-destructive")}>{verdict.ok ? "Accepted" : "Wrong answer"}</p>
        <p className="text-foreground">{verdict.text}</p>
        {verdict.note && <p className="text-xs text-muted-foreground">{verdict.note}</p>}
      </div>
    </div>
  );
}

/** Result sets, an engine error, or an empty state. `title` labels the last set (e.g. "Your output"). */
export function QueryOutputView({ output, running, emptyHint, title }: { output: QueryOutput | null; running: boolean; emptyHint: React.ReactNode; title?: string }) {
  if (running && !output) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Running…
      </p>
    );
  }
  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
        <Database className="size-6" aria-hidden />
        {emptyHint}
      </div>
    );
  }
  if (output.kind === "error") {
    const timedOut = /^Stopped after/.test(output.message);
    return (
      <div role="alert" className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {timedOut ? <Timer className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />}
        <pre className="min-w-0 flex-1 font-mono text-xs whitespace-pre-wrap text-destructive">{output.message}</pre>
      </div>
    );
  }
  if (output.sets.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-success" aria-hidden /> Done in {output.ms} ms. The statement returned no rows.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {output.sets.map((s, i) => (
        <ResultTable
          key={i}
          columns={s.columns}
          rows={s.rows}
          total={s.total}
          label={`Result ${i + 1}`}
          title={i === output.sets.length - 1 ? (title ?? (output.sets.length > 1 ? `Result ${i + 1}` : "Result")) : `Result ${i + 1}`}
        />
      ))}
      <p className="text-xs text-muted-foreground tabular">{output.ms} ms</p>
    </div>
  );
}
