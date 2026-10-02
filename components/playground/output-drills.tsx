"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Code2, Eye, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DRILLS, type Drill } from "@/lib/playground/drills";
import { normalizeOutput, runCode } from "@/lib/playground/runner";
import { cn } from "@/lib/utils";

type Outcome = "correct" | "wrong" | "revealed";

export function OutputDrills({ onOpenInEditor, modKey }: { onOpenInEditor: (drill: Drill) => void; modKey: string }) {
  const topics = useMemo(() => [...new Set(DRILLS.map((d) => d.topic))], []);
  const [topic, setTopic] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const visible = topic ? DRILLS.filter((d) => d.topic === topic) : DRILLS;
  const correct = Object.values(outcomes).filter((o) => o === "correct").length;
  const attempted = Object.keys(outcomes).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground" aria-label="How drills work">
          {["Predict the output", "Run it", "Compare"].map((s, i) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className="grid size-5 place-items-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">{i + 1}</span>
              <span className="text-foreground">{s}</span>
              {i < 2 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
        <p className="text-sm" aria-live="polite">
          <span className="font-mono font-semibold tabular">{correct}</span>
          <span className="text-muted-foreground">
            {" "}
            / {DRILLS.length} spot on{attempted > correct ? ` · ${attempted - correct} to revisit` : ""}
          </span>
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Filter drills by topic">
          {[null, ...topics].map((t) => (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                topic === t ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {visible.map((d) => (
          <li key={d.id} className="min-w-0">
            <DrillCard
              drill={d}
              outcome={outcomes[d.id]}
              modKey={modKey}
              onOutcome={(o) => setOutcomes((cur) => ({ ...cur, [d.id]: o }))}
              onReset={() =>
                setOutcomes((cur) => {
                  const next = { ...cur };
                  delete next[d.id];
                  return next;
                })
              }
              onOpenInEditor={() => onOpenInEditor(d)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrillCard({
  drill,
  outcome,
  modKey,
  onOutcome,
  onReset,
  onOpenInEditor,
}: {
  drill: Drill;
  outcome?: Outcome;
  modKey: string;
  onOutcome: (o: Outcome) => void;
  onReset: () => void;
  onOpenInEditor: () => void;
}) {
  const [prediction, setPrediction] = useState("");
  const [actual, setActual] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function check(reveal = false) {
    if (running || (!reveal && !prediction.trim())) return;
    setRunning(true);
    try {
      const res = await runCode(drill.code);
      const out = res.logs.map((l) => l.text).join("\n");
      setActual(out);
      onOutcome(reveal ? "revealed" : normalizeOutput(prediction) === normalizeOutput(out) ? "correct" : "wrong");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setActual(null);
    setPrediction("");
    onReset();
  }

  const predicted = normalizeOutput(prediction).split("\n").filter(Boolean);
  const real = normalizeOutput(actual ?? "").split("\n").filter(Boolean);
  const rows = Math.max(predicted.length, real.length);

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-white/5",
        outcome === "correct" && "border-success/40",
        outcome === "wrong" && "border-destructive/40",
      )}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{drill.topic}</p>
          <h3 className="font-medium">{drill.title}</h3>
        </div>
        {outcome === "correct" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
            <CheckCircle2 className="size-3" aria-hidden /> Spot on
          </span>
        )}
        {outcome === "wrong" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-medium text-destructive">
            <XCircle className="size-3" aria-hidden /> Not quite
          </span>
        )}
        {outcome === "revealed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Eye className="size-3" aria-hidden /> Revealed
          </span>
        )}
      </header>

      <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{drill.code}</pre>

      {actual === null ? (
        <>
          <Textarea
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void check();
              }
            }}
            placeholder="Your prediction: one line per console.log"
            className="min-h-24 font-mono text-xs"
            aria-label={`Prediction for ${drill.title}`}
          />
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button onClick={() => check()} disabled={!prediction.trim() || running} className="h-9">
              {running ? <Loader2 className="animate-spin" /> : <Play />} Run &amp; compare
            </Button>
            <Button variant="ghost" onClick={() => check(true)} disabled={running} className="h-9 text-muted-foreground">
              <Eye /> Reveal
            </Button>
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{modKey}+Enter</span>
          </div>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border text-xs">
            <div className="grid grid-cols-[1.25rem_1fr_1fr] gap-2 border-b bg-muted/50 px-2 py-1.5 font-medium text-muted-foreground">
              <span />
              <span>Your prediction</span>
              <span>Actual output</span>
            </div>
            {rows === 0 ? (
              <p className="px-3 py-2 text-muted-foreground">No output.</p>
            ) : (
              <ol className="font-mono">
                {Array.from({ length: rows }, (_, i) => {
                  const ok = outcome !== "revealed" && predicted[i] === real[i];
                  return (
                    <li key={i} className={cn("grid grid-cols-[1.25rem_1fr_1fr] items-start gap-2 px-2 py-1", outcome !== "revealed" && !ok && "bg-destructive/8")}>
                      {outcome === "revealed" ? (
                        <span className="text-muted-foreground tabular">{i + 1}</span>
                      ) : ok ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 text-success" aria-label="Match" />
                      ) : (
                        <XCircle className="mt-0.5 size-3.5 text-destructive" aria-label="Mismatch" />
                      )}
                      <span className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">{predicted[i] ?? "—"}</span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{real[i] ?? "—"}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={reset} className="h-9">
              <RotateCcw /> Try again
            </Button>
            <Button variant="ghost" onClick={onOpenInEditor} className="h-9">
              <Code2 /> Open in editor
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
