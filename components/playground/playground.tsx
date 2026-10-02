"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, FilePlus2, Play, Save, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { deleteSnippetAction, saveSnippetAction } from "@/app/(app)/playground/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DRILLS, type Drill } from "@/lib/playground/drills";
import { normalizeOutput, runCode, type LogLine, type RunResult } from "@/lib/playground/runner";
import type { SnippetSummary } from "@/lib/services/snippets";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./code-editor";

const STARTER = `// ⌘/Ctrl + Enter to run. No DOM, no network, 3 s limit.
const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const log = debounce((x) => console.log("fired", x), 50);
log(1); log(2); log(3);
console.log("scheduled");`;

const LEVEL_CLASS: Record<LogLine["level"], string> = {
  log: "text-foreground",
  info: "text-chart-5",
  debug: "text-muted-foreground",
  warn: "text-warning",
  error: "text-destructive",
};

export function Playground({ snippets, initialCode }: { snippets: SnippetSummary[]; initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? STARTER);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<{ id?: string; title: string; tag: string }>({ title: "", tag: "" });
  const [pending, startTransition] = useTransition();

  async function run() {
    if (running) return;
    setRunning(true);
    setResult(await runCode(code));
    setRunning(false);
  }

  function save() {
    startTransition(async () => {
      const res = await saveSnippetAction({ ...current, title: current.title || "Untitled", code });
      if (!res.ok) toast.error(`${res.error}.`);
      else {
        setCurrent((c) => ({ ...c, id: res.id, title: c.title || "Untitled" }));
        toast.success("Snippet saved");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteSnippetAction(id);
      if (!res.ok) toast.error(res.error);
      else if (current.id === id) setCurrent({ title: "", tag: "" });
    });
  }

  return (
    <Tabs defaultValue="editor">
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="drills">Output drills</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="order-2 lg:order-1">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Snippets</CardTitle>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="New snippet"
              onClick={() => {
                setCurrent({ title: "", tag: "" });
                setCode("");
                setResult(null);
              }}
            >
              <FilePlus2 />
            </Button>
          </CardHeader>
          <CardContent>
            {snippets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Saved snippets appear here. Tag them by topic, e.g. js-async.</p>
            ) : (
              <ul className="space-y-1">
                {snippets.map((s) => (
                  <li key={s.id} className={cn("group flex items-center gap-1 rounded-md", current.id === s.id && "bg-muted")}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrent({ id: s.id, title: s.title, tag: s.tag });
                        setCode(s.code);
                        setResult(null);
                      }}
                      className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm"
                    >
                      <span className="block truncate">{s.title}</span>
                      {s.tag && <span className="block truncate text-xs text-muted-foreground">#{s.tag}</span>}
                    </button>
                    <Button size="icon-xs" variant="ghost" aria-label={`Delete ${s.title}`} onClick={() => remove(s.id)} className="opacity-60 group-hover:opacity-100">
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="order-1 space-y-3 lg:order-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={current.title} onChange={(e) => setCurrent((c) => ({ ...c, title: e.target.value }))} placeholder="Snippet title" className="max-w-56" aria-label="Snippet title" />
            <Input value={current.tag} onChange={(e) => setCurrent((c) => ({ ...c, tag: e.target.value }))} placeholder="tag e.g. js-async" className="max-w-40" aria-label="Snippet tag" />
            <Button variant="outline" onClick={save} disabled={pending}>
              <Save /> {current.id ? "Update" : "Save"}
            </Button>
            <Button onClick={run} disabled={running} className="ml-auto">
              <Play /> {running ? "Running…" : "Run"}
            </Button>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <CodeEditor value={code} onChange={setCode} onRun={run} />
            <ConsoleOutput result={result} running={running} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="drills" className="mt-4 grid gap-4 md:grid-cols-2">
        {DRILLS.map((d) => (
          <DrillCard key={d.id} drill={d} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

function ConsoleOutput({ result, running }: { result: RunResult | null; running: boolean }) {
  return (
    <div className="flex min-h-80 flex-col rounded-lg border bg-muted/30" aria-live="polite">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span>Console</span>
        {result && <span className="tabular font-mono">{result.timedOut ? "killed after 3 s" : `${result.ms} ms`}</span>}
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
        {running && <span className="text-muted-foreground">Running…</span>}
        {!running && !result && <span className="text-muted-foreground">Output appears here.</span>}
        {result?.logs.map((l, i) => (
          <div key={i} className={LEVEL_CLASS[l.level]}>
            {l.text}
          </div>
        ))}
        {result && !result.logs.length && !result.timedOut && <span className="text-muted-foreground">(no output)</span>}
        {result?.timedOut && <div className="text-warning">⏱ Stopped: still running after 3 s (infinite loop or open interval?)</div>}
      </pre>
    </div>
  );
}

function DrillCard({ drill }: { drill: Drill }) {
  const [prediction, setPrediction] = useState("");
  const [actual, setActual] = useState<string | null>(null);
  const correct = actual !== null && normalizeOutput(prediction) === normalizeOutput(actual);

  async function check() {
    const res = await runCode(drill.code);
    setActual(res.logs.map((l) => l.text).join("\n"));
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-xs text-muted-foreground">{drill.topic}</p>
        <CardTitle className="text-base">{drill.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{drill.code}</pre>
        <Textarea
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Predict the console output, one line per log"
          className="min-h-20 font-mono text-xs"
          aria-label={`Prediction for ${drill.title}`}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={check} disabled={!prediction.trim()}>
            Run &amp; compare
          </Button>
          {actual !== null && (
            <span className={cn("flex items-center gap-1 text-sm", correct ? "text-success" : "text-destructive")}>
              {correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {correct ? "Spot on" : "Not quite"}
            </span>
          )}
        </div>
        {actual !== null && !correct && (
          <pre className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs whitespace-pre-wrap">{actual || "(no output)"}</pre>
        )}
      </CardContent>
    </Card>
  );
}
