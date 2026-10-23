"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, EyeOff, XCircle } from "lucide-react";
import type { TestCase } from "@/modules/dsa/domain/dsa-runner";
import { parseRunError, type RunLanguage } from "@/modules/dsa/domain/run-errors";
import type { CaseResult } from "@/core/sandbox/run";
import { cn } from "@/core/utils";

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

/** When a case threw, say why in plain words and offer a jump to the line in your code. */
function ThrownAssist({ actual, language, source, onJump }: { actual: string; language?: RunLanguage; source?: string; onJump?: (line: number, column?: number) => void }) {
  if (!language || !actual.startsWith("threw ")) return null;
  const parsed = parseRunError(language, actual.slice(6), source);
  if (!parsed || (!parsed.hint && !parsed.line)) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {parsed.line && onJump && (
        <button
          type="button"
          onClick={() => onJump(parsed.line!, parsed.column)}
          className="h-7 rounded border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Go to line {parsed.line}
        </button>
      )}
      {parsed.hint && <span>{parsed.hint}</span>}
    </div>
  );
}

export function ResultTab({
  view,
  params,
  language,
  source,
  onJump,
}: {
  view: RunView | null;
  params: string[];
  language?: RunLanguage;
  source?: string;
  onJump?: (line: number, column?: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  if (!view) return <p className="py-6 text-center text-sm text-muted-foreground">Run your code to see the output here.</p>;

  if (view.crashed) {
    const parsed = language ? parseRunError(language, view.crashed, source) : null;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-base font-semibold text-destructive">{/SyntaxError|Line \d+:\d+/.test(view.crashed) ? "Compile error" : "Runtime error"}</p>
          {parsed?.line && onJump && (
            <button
              type="button"
              onClick={() => onJump(parsed.line!, parsed.column)}
              className="h-7 rounded border bg-background px-2 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Go to line {parsed.line}
            </button>
          )}
        </div>
        <pre className="overflow-x-auto rounded-md bg-destructive/8 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">{view.crashed}</pre>
        {parsed?.hint && <p className="text-sm text-muted-foreground">{parsed.hint}</p>}
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
              <ThrownAssist actual={result.actual} language={language} source={source} onJump={onJump} />
              {c.custom ? <p className="text-2xs text-muted-foreground">Custom input: no expected answer to compare against.</p> : <Field label="Expected" value={show(c.expected)} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
