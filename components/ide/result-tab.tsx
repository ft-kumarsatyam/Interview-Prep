"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, EyeOff, XCircle } from "lucide-react";
import type { TestCase } from "@/lib/domain/dsa-runner";
import type { CaseResult } from "@/lib/sandbox/run";
import { cn } from "@/lib/utils";

export interface RunView {
  kind: "run" | "submit";
  cases: Array<TestCase & { custom?: boolean }>;
  results: CaseResult[];
  ms: number;
  timedOut: boolean;
  crashed?: string;
}

const show = (v: unknown) => (v === undefined ? "undefined" : (JSON.stringify(v) ?? String(v)));

function Field({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <pre
        className={cn(
          "overflow-x-auto rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs break-all whitespace-pre-wrap",
          tone === "bad" && "text-destructive",
          tone === "good" && "text-success",
        )}
      >
        {value}
      </pre>
    </div>
  );
}

export function ResultTab({ view, params }: { view: RunView | null; params: string[] }) {
  const [picked, setPicked] = useState<number | null>(null);

  if (!view) return <p className="py-6 text-center text-sm text-muted-foreground">Run your code to see the output here.</p>;

  if (view.crashed) {
    return (
      <div className="space-y-2">
        <p className="text-base font-semibold text-destructive">{/SyntaxError|Line \d+:\d+/.test(view.crashed) ? "Compile error" : "Runtime error"}</p>
        <pre className="overflow-x-auto rounded-md bg-destructive/8 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">{view.crashed}</pre>
      </div>
    );
  }

  const judged = view.results.filter((r) => !view.cases[r.index]?.custom);
  const passed = judged.filter((r) => r.pass).length;
  const allPassed = !view.timedOut && judged.length > 0 && passed === judged.length && view.results.length === view.cases.length;
  const firstFail = view.results.find((r) => !r.pass && !view.cases[r.index]?.custom);
  const selected = picked ?? (view.kind === "submit" ? (firstFail?.index ?? 0) : 0);
  const result = view.results.find((r) => r.index === selected);
  const c = view.cases[selected];

  const verdict = view.timedOut
    ? "Time limit exceeded"
    : judged.length === 0
      ? "Finished"
      : allPassed
        ? "Accepted"
        : "Wrong answer";

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={cn("text-base font-semibold", verdict === "Accepted" ? "text-success" : verdict === "Finished" ? "text-foreground" : "text-destructive")}>{verdict}</p>
        {judged.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {passed}/{judged.length} {view.kind === "submit" ? "cases passed" : "passed"}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden /> {view.ms} ms
        </span>
        {view.timedOut && <span className="text-xs text-muted-foreground">Your code ran too long (likely an infinite loop or a slow approach).</span>}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Cases">
        {view.cases.map((cs, i) => {
          const r = view.results.find((x) => x.index === i);
          const Icon = !r ? Circle : cs.custom ? Circle : r.pass ? CheckCircle2 : XCircle;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={selected === i}
              onClick={() => setPicked(i)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className={cn("size-3.5", r && !cs.custom && (r.pass ? "text-success" : "text-destructive"))} aria-hidden />
              {cs.hidden && <EyeOff className="size-3" aria-hidden />}
              {cs.hidden ? `Hidden ${i + 1}` : `Case ${i + 1}`}
            </button>
          );
        })}
      </div>

      {c && result && (
        <div className="space-y-2">
          {c.hidden ? (
            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              Hidden case: {result.pass ? "passed." : "failed. Its input stays hidden; check edge cases like empty input, duplicates and extremes."}
            </p>
          ) : (
            <>
              {c.input.map((v, ai) => (
                <Field key={ai} label={params[ai] ?? `arg ${ai + 1}`} value={show(v)} />
              ))}
              <Field label="Output" value={result.actual} tone={c.custom ? undefined : result.pass ? "good" : "bad"} />
              {c.custom ? <p className="text-2xs text-muted-foreground">Custom input: no expected answer to compare against.</p> : <Field label="Expected" value={show(c.expected)} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
