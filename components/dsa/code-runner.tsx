"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Play, RotateCcw, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { markAttemptedAction, revealCaseAction } from "@/app/(app)/dsa/[slug]/actions";
import { AskGemini } from "@/components/ai/ask-gemini";
import { CopyAndOpen } from "./copy-and-open";
import { CodeEditor } from "@/components/playground/code-editor";
import { SolveSheet } from "@/components/progress/solve-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProblemTestcaseEntry } from "@/lib/content";
import { dsaPrompt } from "@/lib/domain/ask-prompt";
import { describeFailure, effectiveCases, pickRevealCase, remapSubset, remapToFullIndex, summarizeCases, visibleCases } from "@/lib/domain/dsa-runner";
import { runWithCases, type CaseResult } from "@/lib/sandbox/run";
import { cn } from "@/lib/utils";
import { EdgeCasesPanel } from "./edge-cases-panel";
import { HintReveal } from "./hint-reveal";
import { TestCasePanel } from "./test-case-panel";

/** JS/TS only, runs entirely in the browser (no server execution) — same sandbox the Playground uses. */
export function CodeRunner({
  slug,
  title,
  entry,
  difficulty,
  pattern,
  url,
  revealedCases = [],
}: {
  slug: string;
  title: string;
  entry: ProblemTestcaseEntry;
  difficulty?: string;
  pattern?: string;
  url: string;
  /** Hidden cases already shown to you after earlier failed submits. */
  revealedCases?: number[];
}) {
  const [code, setCode] = useState(entry.starter);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const [solveOpen, setSolveOpen] = useState(false);
  /** Set when the solve was detected on LeetCode, so the form logs it on the day you actually solved it. */
  const [solveDate, setSolveDate] = useState<string | undefined>(undefined);
  const [, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<number[]>(revealedCases);
  const cases = effectiveCases(entry.cases, revealed);
  const shape = { argTypes: entry.argTypes, returns: entry.returns, compare: entry.compare };
  const fn = entry.signature.functionName;

  async function run() {
    if (running) return;
    setRunning("run");
    setResults(null);
    const res = await runWithCases(code, fn, visibleCases(cases), 3000, shape);
    setResults(remapToFullIndex(cases, res.cases, true));
    if (res.crashed) toast.error(res.crashed);
    setRunning(null);
  }

  /** Run just some of the cases (one edge case, or all the edge cases). */
  async function runIndices(indices: number[]) {
    if (running) return;
    setRunning("run");
    setResults(null);
    const res = await runWithCases(code, fn, indices.map((i) => cases[i]!), 3000, shape);
    setResults(remapSubset(indices, res.cases));
    if (res.crashed) toast.error(res.crashed);
    setRunning(null);
  }

  async function submit() {
    if (running) return;
    setRunning("submit");
    setResults(null);
    const res = await runWithCases(code, fn, cases, 3000, shape);
    setResults(res.cases);
    setRunning(null);
    if (res.crashed) {
      toast.error(res.crashed);
      return;
    }
    const summary = summarizeCases(res.cases);
    if (summary.allPassed) {
      setSolveOpen(true);
    } else {
      const reveal = pickRevealCase(cases, res.cases, revealed);
      toast.error(`${summary.passed}/${summary.total} cases passed${reveal === undefined ? "" : ". One hidden case is now shown so you can debug it."}`);
      startTransition(() => {
        void markAttemptedAction(slug);
        if (reveal !== undefined) {
          void revealCaseAction({ slug, index: reveal }).then((r) => {
            if (r.ok) setRevealed((prev) => (prev.includes(reveal) ? prev : [...prev, reveal]));
          });
        }
      });
    }
  }

  const summary = results ? summarizeCases(results) : null;
  const edgeCount = cases.filter((c) => c.edge && !c.hidden).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          {fn}() · JavaScript · runs in your browser
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={running !== null || code === entry.starter}
          onClick={() => {
            if (window.confirm("Reset the editor to the starter code? Your current code will be lost.")) {
              setCode(entry.starter);
              setResults(null);
            }
          }}
        >
          <RotateCcw /> Reset
        </Button>
      </div>
      <CodeEditor value={code} onChange={setCode} onRun={run} minHeight="280px" ariaLabel={`Code editor for ${title}`} />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Button variant="outline" size="lg" className="h-10" onClick={run} disabled={running !== null}>
          {running === "run" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />}
          {running === "run" ? "Running…" : "Run"}
          <kbd className="ml-1 hidden rounded border px-1 font-mono text-[10px] text-muted-foreground md:inline">⌘↵</kbd>
        </Button>
        <Button size="lg" className="h-10" onClick={submit} disabled={running !== null}>
          {running === "submit" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />}
          {running === "submit" ? "Submitting…" : "Submit"}
        </Button>
        {summary && (
          <p
            role="status"
            className={cn(
              "col-span-2 inline-flex items-center gap-1.5 text-sm font-medium sm:ml-1",
              summary.allPassed ? "text-success" : "text-destructive",
            )}
          >
            {summary.allPassed ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
            {summary.allPassed ? `All ${summary.total} passed` : `${summary.passed}/${summary.total} passed`}
          </p>
        )}
      </div>

      <Tabs defaultValue="cases">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="cases" className="px-3">
            Cases <span className="tabular font-mono text-xs text-muted-foreground">{cases.length}</span>
          </TabsTrigger>
          <TabsTrigger value="edges" className="px-3">
            Edge cases <span className="tabular font-mono text-xs text-muted-foreground">{edgeCount}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cases">
          <TestCasePanel cases={cases} results={results} />
        </TabsContent>
        <TabsContent value="edges">
          <EdgeCasesPanel cases={cases} results={results} busy={running !== null} onRun={(indices) => void runIndices(indices)} />
        </TabsContent>
      </Tabs>

      <HintReveal hints={entry.hints} />

      <div className="space-y-2 rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">Passing here? Submit it on LeetCode too. Your Accepted submission is detected and logged automatically.</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyAndOpen
            slug={slug}
            url={url}
            getCode={() => code}
            onAccepted={(date) => {
              setSolveDate(date);
              setSolveOpen(true);
            }}
          />
          <AskGemini
            subject={pattern && /^SQL/.test(pattern) ? "dbms" : pattern === "JavaScript 30-Days" ? "js" : "dsa"}
            label="Ask Gemini about my code"
            className="h-9"
            prompt={() => dsaPrompt({ title, difficulty, pattern, code, failure: results ? describeFailure(cases, results) : undefined })}
          />
        </div>
      </div>
      <SolveSheet target={solveOpen ? { slug, title, date: solveDate } : null} onOpenChange={setSolveOpen} />
    </div>
  );
}
