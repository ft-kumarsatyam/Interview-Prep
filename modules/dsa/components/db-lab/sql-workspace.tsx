"use client";

import { useMemo, useRef, useState } from "react";
import { AArrowDown, AArrowUp, Database, Eye, Loader2, Maximize2, Minimize2, Play, RotateCcw, Send, Table2 } from "lucide-react";
import { toast } from "sonner";
import { useIde } from "@/modules/dsa/components/ide/ide-shell";
import { readPref, useHydrated, writePref } from "@/modules/dsa/components/ide/use-client-prefs";
import { CodeEditor } from "@/modules/dsa/components/playground/lazy-code-editor";
import { CompactTabsList, CompactTabsTrigger } from "@/components/shared/compact-tabs";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { isBlankQuery } from "@/modules/dsa/domain/db-lab";
import { stepFontSize } from "@/modules/dsa/domain/ide";
import type { SqlProblem } from "@/modules/dsa/domain/sql-problems";
import { parseSchema } from "@/modules/dsa/domain/sql-schema";
import { judgeSql, runQuery, type QueryOutput, type QueryVerdict } from "@/core/sandbox/sql-judge";
import { cn } from "@/core/utils";
import { QueryOutputView, VerdictBanner } from "@/modules/dsa/components/db-lab/query-output";
import { SqlSchemaBrowser } from "@/modules/dsa/components/db-lab/schema-browser";

type BottomTab = "result" | "expected" | "tables";

export interface SqlSubmitOutcome {
  verdict: QueryVerdict;
  code: string;
}

/** Waits for hydration so the saved draft can be read from localStorage on first render. */
export function SqlWorkspace(props: { problem: SqlProblem; title: string; onSubmit: (out: SqlSubmitOutcome) => void; onCodeChange?: (code: string) => void }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-full min-h-[420px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-hidden />;
  return <Workspace {...props} />;
}

function Workspace({ problem, title, onSubmit, onCodeChange }: { problem: SqlProblem; title: string; onSubmit: (out: SqlSubmitOutcome) => void; onCodeChange?: (code: string) => void }) {
  const { split, full, toggleFull } = useIde();
  const tables = useMemo(() => parseSchema(problem.seed), [problem.seed]);
  const starter = problem.verify
    ? `-- Write your statement. ⌘/Ctrl + Enter runs it; ⌘/Ctrl + Shift + Enter submits.\n-- Afterwards the table is checked with: ${problem.verify}\n`
    : `-- Write your query. ⌘/Ctrl + Enter runs it; ⌘/Ctrl + Shift + Enter submits.\nSELECT *\nFROM ${tables[0]?.name ?? "table_name"};\n`;
  const key = `draft:sql:${problem.slug}`;

  const [code, setCodeState] = useState(() => readPref(key) ?? starter);
  const [fontSize, setFontSize] = useState(() => Number(readPref("ide-font")) || 14);
  const [tab, setTab] = useState<BottomTab>("result");
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const [output, setOutput] = useState<QueryOutput | null>(null);
  const [outputTitle, setOutputTitle] = useState("Your output");
  const [expected, setExpected] = useState<QueryOutput | null>(null);
  const [verdict, setVerdict] = useState<QueryVerdict | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function setCode(next: string) {
    setCodeState(next);
    onCodeChange?.(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writePref(key, next === starter ? null : next), 400);
  }

  function changeFont(dir: 1 | -1) {
    const next = stepFontSize(fontSize, dir);
    setFontSize(next);
    writePref("ide-font", String(next));
  }

  async function loadExpected(): Promise<QueryOutput> {
    const ref = expected ?? (await runQuery(problem.seed, problem.solution, { fresh: true, verify: problem.verify }));
    setExpected(ref);
    return ref;
  }

  async function run() {
    if (running) return;
    if (isBlankQuery(code)) return void toast.message("Write a query first.");
    setRunning("run");
    try {
      setVerdict(null);
      setOutput(await runQuery(problem.seed, code, { fresh: true, verify: problem.verify }));
      setOutputTitle(problem.verify ? "Table after your statement" : "Your output");
      setTab("result");
    } finally {
      setRunning(null);
    }
  }

  async function preview(name: string) {
    if (running) return;
    setRunning("run");
    try {
      setVerdict(null);
      setOutput(await runQuery(problem.seed, `SELECT * FROM ${name}`, { fresh: true }));
      setOutputTitle(`Preview: ${name}`);
      setTab("result");
    } finally {
      setRunning(null);
    }
  }

  async function submit() {
    if (running) return;
    if (isBlankQuery(code)) return void toast.message("Write a query first.");
    setRunning("submit");
    try {
      const res = await judgeSql({ seed: problem.seed, mine: code, reference: problem.solution, ordered: problem.ordered, verify: problem.verify });
      setOutput(res.mine);
      setOutputTitle(problem.verify ? "Table after your statement" : "Your output");
      setExpected(res.expected);
      setVerdict(res.verdict);
      setTab("result");
      onSubmit({ verdict: res.verdict, code });
    } finally {
      setRunning(null);
    }
  }

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium" title="SQLite in your browser, with MySQL helpers (IF, DATEDIFF, DATE_FORMAT, YEAR, MONTH, …)">
        <Database className="size-3.5 text-primary" aria-hidden /> SQLite
      </span>
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
        aria-label="Reset to starter"
        title="Reset to starter"
        onClick={() => window.confirm("Reset the editor? Your current query will be lost.") && setCode(starter)}
      >
        <RotateCcw />
      </Button>
      {split && (
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={toggleFull} aria-label={full ? "Exit focus mode" : "Focus mode (F)"} title={full ? "Exit focus mode (Esc)" : "Focus mode (F)"}>
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={run} disabled={running !== null} title="Run (Ctrl/⌘ + Enter)">
          {running === "run" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />} Run
        </Button>
        <Button type="button" size="sm" className="h-8" onClick={submit} disabled={running !== null} title="Submit (Ctrl/⌘ + Shift + Enter)">
          {running === "submit" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />} Submit
        </Button>
      </div>
    </div>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={setCode}
      onRun={run}
      onSubmit={submit}
      language="sql"
      fontSize={fontSize}
      fill={split}
      minHeight="40dvh"
      ariaLabel={`SQL editor for ${title}`}
      className="rounded-none border-0"
    />
  );

  const bottom = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as BottomTab)} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 items-center border-b bg-muted/30 px-2 py-1">
        <CompactTabsList>
          <CompactTabsTrigger value="result">
            Result
            {verdict && <span className={cn("size-1.5 rounded-full", verdict.ok ? "bg-success" : "bg-destructive")} aria-hidden />}
          </CompactTabsTrigger>
          <CompactTabsTrigger value="expected">Expected</CompactTabsTrigger>
          <CompactTabsTrigger value="tables">
            <Table2 className="size-3.5" /> Tables <span className="font-mono text-2xs text-muted-foreground">{tables.length}</span>
          </CompactTabsTrigger>
        </CompactTabsList>
      </div>
      <div className={cn("min-h-0 flex-1 p-3", split && "overflow-y-auto overscroll-contain")}>
        <TabsContent value="result" className="space-y-3">
          {verdict && <VerdictBanner verdict={verdict} />}
          <QueryOutputView
            output={output}
            running={running !== null}
            title={outputTitle}
            emptyHint={
              <>
                <p>Run your query to see its rows. Submit compares them with the expected output.</p>
                <p className="text-xs">The Tables tab lists every column and previews the sample data.</p>
              </>
            }
          />
          {verdict && !verdict.ok && expected && <QueryOutputView output={expected} running={false} title="Expected output" emptyHint={null} />}
        </TabsContent>
        <TabsContent value="expected">
          {expected ? (
            <QueryOutputView output={expected} running={false} title="Expected output" emptyHint={null} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
              <p>The rows a correct answer returns on this sample data. The query itself stays hidden.</p>
              <Button type="button" size="sm" variant="outline" disabled={running !== null} onClick={() => void loadExpected()}>
                <Eye /> Show expected output
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="tables">
          <SqlSchemaBrowser tables={tables} onPreview={(t) => void preview(t)} />
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
        <ResizablePanelGroup storageId="ide:sql-editor-results" orientation="vertical">
          <ResizablePanel id="editor" defaultSize="50" minSize="20">
            {editor}
          </ResizablePanel>
          <ResizableHandle orientation="vertical" className="border-t" />
          <ResizablePanel id="results" defaultSize="50" minSize="15">
            {bottom}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
