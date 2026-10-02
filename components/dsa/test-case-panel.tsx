import { CheckCircle2, EyeOff, XCircle } from "lucide-react";
import type { ProblemTestCase } from "@/lib/content";
import { EDGE_CASES } from "@/lib/domain/edge-cases";
import type { CaseResult } from "@/lib/sandbox/run";
import { cn } from "@/lib/utils";

export function CaseVerdict({ result }: { result?: CaseResult }) {
  if (!result) return null;
  return result.pass ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <CheckCircle2 className="size-4" aria-hidden /> Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <XCircle className="size-4" aria-hidden /> Fail
    </span>
  );
}

export function CaseIo({ c, result }: { c: ProblemTestCase; result?: CaseResult }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md bg-muted/50 p-2 font-mono text-xs">
      <dt className="text-muted-foreground">input</dt>
      <dd className="break-all">{JSON.stringify(c.input)}</dd>
      <dt className="text-muted-foreground">expected</dt>
      <dd className="break-all">{JSON.stringify(c.expected)}</dd>
      {result && (
        <>
          <dt className="text-muted-foreground">actual</dt>
          <dd className={cn("break-all", !result.pass && "text-destructive")}>{result.actual}</dd>
        </>
      )}
    </dl>
  );
}

/** Visible cases always show input/expected/actual; hidden cases only show pass/fail, so retrying still means something. */
export function TestCasePanel({ cases, results }: { cases: ProblemTestCase[]; results: CaseResult[] | null }) {
  return (
    <div className="space-y-2">
      {cases.map((c, i) => {
        const result = results?.find((r) => r.index === i);
        return (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3 text-sm",
              result && (result.pass ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"),
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                {c.hidden && <EyeOff className="size-3.5 text-muted-foreground" aria-hidden />}
                {c.hidden ? `Hidden case ${i + 1}` : `Case ${i + 1}`}
                {!c.hidden && c.edge && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{EDGE_CASES[c.edge].label}</span>}
              </span>
              <CaseVerdict result={result} />
            </div>
            {c.hidden ? <p className="mt-1 text-xs text-muted-foreground">Runs on Submit only.</p> : <CaseIo c={c} result={result} />}
          </div>
        );
      })}
    </div>
  );
}
