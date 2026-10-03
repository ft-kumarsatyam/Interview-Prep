"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AArrowDown, AArrowUp, Loader2, Maximize2, Minimize2, Play, RotateCcw, Send, Terminal } from "lucide-react";
import { toast } from "sonner";
import { EdgeCasesPanel } from "@/components/dsa/edge-cases-panel";
import { CodeEditor } from "@/components/playground/code-editor";
import { CompactTabsList, CompactTabsTrigger } from "@/components/shared/compact-tabs";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { summarizeCases, type ArgType, type CaseSummary, type CompareMode, type ReturnKind, type TestCase } from "@/lib/domain/dsa-runner";
import { caseToDraft, casesFromInputs, parseDrafts, stepFontSize, type CaseDraft } from "@/lib/domain/ide";
import { LANGUAGES, isLanguage, starterFor, type Language, type StarterSource } from "@/lib/domain/starters";
import { runCasesIn } from "@/lib/sandbox/languages";
import { bootPython, pyStatus, subscribePyStatus } from "@/lib/sandbox/py-run";
import type { CaseResult, LogLine } from "@/lib/sandbox/run";
import { cn } from "@/lib/utils";
import { useIde } from "./ide-shell";
import { ResultTab, type RunView } from "./result-tab";
import { TestcaseTab } from "./testcase-tab";
import { useHydrated } from "./use-client-prefs";
import { readPref, writePref } from "./use-client-prefs";

export interface RunnableEntry extends StarterSource {
  argTypes?: ArgType[];
  returns?: ReturnKind;
  compare?: CompareMode;
}

export interface SubmitOutcome {
  results: CaseResult[];
  summary: CaseSummary;
  code: string;
  language: Language;
  crashed?: string;
  timedOut: boolean;
  ms: number;
}

export interface CodeWorkspaceProps {
  /** Drafts are saved per key and language in localStorage. */
  draftKey: string;
  title: string;
  entry: RunnableEntry;
  /** Every case, hidden ones included (Submit runs them all). */
  cases: TestCase[];
  onSubmit?: (outcome: SubmitOutcome) => void;
  submitLabel?: string;
  /** Rendered at the right of the toolbar, e.g. a mock-interview timer. */
  toolbarExtra?: React.ReactNode;
  onCodeChange?: (code: string, language: Language) => void;
  /** Start from this code instead of a draft (e.g. resuming a mock interview). */
  initial?: { language: Language; code: string };
  disabled?: boolean;
}

/** Waits for hydration so drafts and preferences can be read from localStorage on first render. */
export function CodeWorkspace(props: CodeWorkspaceProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-full min-h-[420px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-hidden />;
  return <Workspace {...props} />;
}

type BottomTab = "cases" | "result" | "edges" | "console";

function Workspace({ draftKey, title, entry, cases, onSubmit, submitLabel = "Submit", toolbarExtra, onCodeChange, initial, disabled }: CodeWorkspaceProps) {
  const { split, full, toggleFull } = useIde();
  const params = entry.signature.params;
  const visible = cases.filter((c) => !c.hidden);
  const shape = { argTypes: entry.argTypes, returns: entry.returns, compare: entry.compare };
  const fn = entry.signature.functionName;

  const [language, setLanguage] = useState<Language>(() => {
    if (initial) return initial.language;
    const saved = readPref("ide-lang");
    return isLanguage(saved) ? saved : "javascript";
  });
  const [codeByLang, setCodeByLang] = useState<Record<Language, string>>(() => {
    const out = {} as Record<Language, string>;
    for (const l of LANGUAGES) out[l.id] = readPref(`draft:${draftKey}:${l.id}`) ?? starterFor(l.id, entry);
    if (initial) out[initial.language] = initial.code;
    return out;
  });
  const [fontSize, setFontSize] = useState(() => Number(readPref("ide-font")) || 14);
  const [tab, setTab] = useState<BottomTab>("cases");
  const [drafts, setDrafts] = useState<CaseDraft[]>(() => (visible.length ? visible.map(caseToDraft) : [params.map(() => "")]));
  const [selectedDraft, setSelectedDraft] = useState(0);
  const [view, setView] = useState<RunView | null>(null);
  const [runId, setRunId] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [edgeResults, setEdgeResults] = useState<CaseResult[] | null>(null);
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const py = useSyncExternalStore(subscribePyStatus, pyStatus, () => "idle" as const);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const code = codeByLang[language];
  const starter = starterFor(language, entry);
  const originalDrafts = visible.map(caseToDraft);
  const draftsDirty = JSON.stringify(drafts) !== JSON.stringify(originalDrafts);
  const edgeCount = cases.filter((c) => c.edge && !c.hidden).length;

  useEffect(() => {
    if (language === "python") void bootPython().catch(() => {});
  }, [language]);

  useEffect(() => {
    onCodeChange?.(codeByLang[language], language);
    // Report the starting code (a restored draft) once, so the parent's copy matches the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCode(next: string) {
    setCodeByLang((cur) => ({ ...cur, [language]: next }));
    onCodeChange?.(next, language);
    clearTimeout(saveTimer.current);
    const lang = language;
    saveTimer.current = setTimeout(() => writePref(`draft:${draftKey}:${lang}`, next === starterFor(lang, entry) ? null : next), 400);
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    writePref("ide-lang", next);
    onCodeChange?.(codeByLang[next], next);
  }

  function changeFont(dir: 1 | -1) {
    const next = stepFontSize(fontSize, dir);
    setFontSize(next);
    writePref("ide-font", String(next));
  }

  async function execute(kind: "run" | "submit", toRun: Array<TestCase & { custom?: boolean }>) {
    const res = await runCasesIn(language, code, fn, toRun, shape);
    setView({ kind, cases: toRun, results: res.cases, ms: res.ms, timedOut: res.timedOut, crashed: res.crashed });
    setRunId((n) => n + 1);
    setLogs(res.crashed ? [...res.logs, { level: "error", text: res.crashed }] : res.logs);
    return res;
  }

  async function run() {
    if (running || disabled) return;
    const parsed = parseDrafts(drafts, params);
    if (!parsed.ok) {
      toast.error(parsed.error);
      setTab("cases");
      return;
    }
    setRunning("run");
    try {
      await execute("run", casesFromInputs(parsed.inputs, visible));
      setTab("result");
    } finally {
      setRunning(null);
    }
  }

  async function runEdges(indices: number[]) {
    if (running || disabled) return;
    setRunning("run");
    try {
      const res = await runCasesIn(language, code, fn, indices.map((i) => cases[i]!), shape);
      setEdgeResults(res.cases.flatMap((r) => (indices[r.index] === undefined ? [] : [{ ...r, index: indices[r.index]! }])));
      if (res.crashed) toast.error(res.crashed.split("\n")[0]);
    } finally {
      setRunning(null);
    }
  }

  async function submit() {
    if (running || disabled || !onSubmit) return;
    setRunning("submit");
    try {
      const res = await execute("submit", cases);
      setEdgeResults(res.cases);
      setTab("result");
      onSubmit({ results: res.cases, summary: summarizeCases(res.cases), code, language, crashed: res.crashed, timedOut: res.timedOut, ms: res.ms });
    } finally {
      setRunning(null);
    }
  }

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
      <label className="sr-only" htmlFor={`${draftKey}-lang`}>
        Language
      </label>
      <select
        id={`${draftKey}-lang`}
        value={language}
        onChange={(e) => isLanguage(e.target.value) && changeLanguage(e.target.value)}
        disabled={running !== null}
        className="h-8 rounded-md border bg-background px-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      {language === "python" && py === "loading" && (
        <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> Loading Python…
        </span>
      )}
      <div className="flex items-center">
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => changeFont(-1)} aria-label="Smaller font">
          <AArrowDown />
        </Button>
        <span className="w-6 text-center font-mono text-2xs text-muted-foreground tabular-nums">{fontSize}</span>
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => changeFont(1)} aria-label="Larger font">
          <AArrowUp />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={running !== null || code === starter}
        aria-label="Reset to starter code"
        title="Reset to starter code"
        onClick={() => {
          if (window.confirm(`Reset the ${LANGUAGES.find((l) => l.id === language)?.label} code to the starter? Your current code will be lost.`)) setCode(starter);
        }}
      >
        <RotateCcw />
      </Button>
      {split && (
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={toggleFull} aria-label={full ? "Exit focus mode" : "Focus mode (F)"} title={full ? "Exit focus mode (Esc)" : "Focus mode (F)"}>
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        {toolbarExtra}
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={run} disabled={running !== null || disabled} title="Run (Ctrl/⌘ + Enter)">
          {running === "run" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />}
          Run
        </Button>
        {onSubmit && (
          <Button type="button" size="sm" className="h-8" onClick={submit} disabled={running !== null || disabled} title="Submit (Ctrl/⌘ + Shift + Enter)">
            {running === "submit" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />}
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={setCode}
      onRun={run}
      onSubmit={onSubmit ? submit : undefined}
      language={language}
      fontSize={fontSize}
      fill={split}
      minHeight="52dvh"
      ariaLabel={`Code editor for ${title}`}
      className="rounded-none border-0"
    />
  );

  const bottom = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as BottomTab)} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 items-center border-b bg-muted/30 px-2 py-1">
        <CompactTabsList>
          <CompactTabsTrigger value="cases">
            Testcases
          </CompactTabsTrigger>
          <CompactTabsTrigger value="result">
            Result
            {view && !view.crashed && view.results.length > 0 && (
              <span className={cn("size-1.5 rounded-full", view.results.every((r) => r.pass || view.cases[r.index]?.custom) ? "bg-success" : "bg-destructive")} aria-hidden />
            )}
          </CompactTabsTrigger>
          {edgeCount > 0 && (
            <CompactTabsTrigger value="edges">
              Edge cases <span className="font-mono text-2xs text-muted-foreground">{edgeCount}</span>
            </CompactTabsTrigger>
          )}
          <CompactTabsTrigger value="console">
            <Terminal className="size-3.5" /> Console
            {logs.length > 0 && <span className="font-mono text-2xs text-muted-foreground">{logs.length}</span>}
          </CompactTabsTrigger>
        </CompactTabsList>
      </div>
      <div className={cn("min-h-0 flex-1 p-3", split && "overflow-y-auto overscroll-contain")}>
        <TabsContent value="cases">
          <TestcaseTab
            params={params}
            drafts={drafts}
            selected={Math.min(selectedDraft, drafts.length - 1)}
            onSelect={setSelectedDraft}
            onChange={(ci, ai, text) => setDrafts((d) => d.map((row, i) => (i === ci ? row.map((t, j) => (j === ai ? text : t)) : row)))}
            onAdd={() => {
              setDrafts((d) => [...d, [...(d[selectedDraft] ?? params.map(() => ""))]]);
              setSelectedDraft(drafts.length);
            }}
            onRemove={(i) => {
              setDrafts((d) => d.filter((_, j) => j !== i));
              setSelectedDraft((s) => Math.max(0, s >= i ? s - 1 : s));
            }}
            onReset={() => {
              setDrafts(originalDrafts.length ? originalDrafts : [params.map(() => "")]);
              setSelectedDraft(0);
            }}
            dirty={draftsDirty}
          />
        </TabsContent>
        <TabsContent value="result">
          <ResultTab key={runId} view={view} params={params} />
        </TabsContent>
        {edgeCount > 0 && (
          <TabsContent value="edges">
            <EdgeCasesPanel cases={cases} results={edgeResults} busy={running !== null} onRun={(indices) => void runEdges(indices)} />
          </TabsContent>
        )}
        <TabsContent value="console">
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Anything you print ({language === "python" ? "print()" : "console.log"}) shows up here.
            </p>
          ) : (
            <pre className="space-y-0.5 font-mono text-xs whitespace-pre-wrap">
              {logs.map((l, i) => (
                <div key={i} className={cn(l.level === "error" && "text-destructive", l.level === "warn" && "text-warning")}>
                  {l.text}
                </div>
              ))}
            </pre>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );

  if (!split) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border bg-card">
          {toolbar}
          {editor}
        </div>
        <div className="rounded-xl border bg-card">{bottom}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      {toolbar}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup storageId="ide:editor-console" orientation="vertical">
          <ResizablePanel id="editor" defaultSize="62" minSize="25">
            {editor}
          </ResizablePanel>
          <ResizableHandle orientation="vertical" className="border-t" />
          <ResizablePanel id="console" defaultSize="38" minSize="12">
            {bottom}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
