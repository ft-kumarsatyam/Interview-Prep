"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { listRunsAction } from "@/app/(app)/playground/code-lab-actions";
import { bestMs, type RunSummary } from "@/modules/dsa/domain/code-lab";

/** The latest runs of this problem (counts and time only, never your code), newest first. Reloads when `version` changes. */
export function RunHistory({ kind, refKey, version }: { kind: "playground" | "dsa" | "dblab"; refKey: string; version: number }) {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    void listRunsAction({ kind, ref: refKey, limit: 10 }).then((res) => {
      if (live) setRuns(res.ok ? res.runs : []);
    });
    return () => {
      live = false;
    };
  }, [kind, refKey, version]);

  if (runs === null) return <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>;
  if (runs.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No runs yet. Run or submit and they are listed here.</p>;
  const best = bestMs(runs);
  return (
    <div className="space-y-2">
      {best !== null && (
        <p className="text-xs text-muted-foreground">
          Fastest accepted run in this list: <span className="font-mono tabular text-foreground">{best} ms</span>
        </p>
      )}
      <ul className="space-y-1">
        {runs.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-2.5 py-1.5 text-xs">
            {r.ok ? <CheckCircle2 className="size-3.5 text-success" aria-label="Passed" /> : <XCircle className="size-3.5 text-destructive" aria-label="Failed" />}
            <span className="font-medium capitalize">{r.action}</span>
            <span className="text-muted-foreground">{r.language}</span>
            {r.total > 0 && (
              <span className="font-mono tabular">
                {r.passed}/{r.total}
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" aria-hidden /> <span className="font-mono tabular">{r.ms} ms</span> · {r.on}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
