"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Eraser, Eye, History, Lightbulb, ListChecks, Loader2, Play, RotateCcw, Send, Table2, Target, X } from "lucide-react";
import { toast } from "sonner";
import { CodeEditor } from "@/modules/dsa/components/playground/lazy-code-editor";
import { useModKey } from "@/modules/dsa/components/playground/use-mod-key";
import { DESKTOP_QUERY, readPref, useHydrated, useMediaQuery, writePref } from "@/modules/dsa/components/ide/use-client-prefs";
import { DifficultyBadge } from "@/components/shared/badges";
import { CompactTabsList, CompactTabsTrigger } from "@/components/shared/compact-tabs";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  MONGO_DATASETS,
  SQL_DATASETS,
  DB_CHALLENGES,
  STARTERS,
  compareRows,
  docsToRows,
  isBlankQuery,
  mongoDataset,
  sqlDataset,
  type Cell,
  type DbChallenge,
  type DbMode,
  type Row,
} from "@/modules/dsa/domain/db-lab";
import { runMongo } from "@/modules/dsa/domain/mongo-query";
import { parseSchema } from "@/modules/dsa/domain/sql-schema";
import { judgeOutputs, runQuery, type QueryOutput, type QueryVerdict } from "@/core/sandbox/sql-judge";
import { resetSqlDatabase, type SqlResultSet } from "@/core/sandbox/sql-run";
import { cn } from "@/core/utils";
import { QueryOutputView, VerdictBanner } from "@/modules/dsa/components/db-lab/query-output";
import { MongoSchemaBrowser, SqlSchemaBrowser } from "@/modules/dsa/components/db-lab/schema-browser";
import { ChallengeCatalog, type CatalogFilter } from "@/modules/dsa/components/db-lab/challenge-catalog";
import { groupByTopic, nextUnsolved, topicLabel } from "@/modules/dsa/domain/db-lab-topics";

type SideTab = "challenges" | "schema";
type BottomTab = "result" | "expected" | "history";
type MobilePane = "query" | "challenges" | "schema";

const SOLVED_KEY = "db-lab:solved";
const HISTORY_MAX = 20;

function loadList(key: string): string[] {
  try {
    const v = JSON.parse(readPref(key) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function docsToSet(docs: unknown[]): SqlResultSet {
  const objs = docs.filter((d): d is Record<string, unknown> => d !== null && typeof d === "object" && !Array.isArray(d));
  if (objs.length !== docs.length || objs.length === 0) {
    return { columns: ["value"], rows: docs.map((d) => [typeof d === "object" ? JSON.stringify(d) : (d as Cell)]), total: docs.length };
  }
  const columns = [...new Set(objs.flatMap((o) => Object.keys(o)))];
  const rows: Row[] = objs.map((o) => columns.map((c) => (o[c] === undefined ? null : typeof o[c] === "object" && o[c] !== null ? JSON.stringify(o[c]) : (o[c] as Cell))));
  return { columns, rows, total: rows.length };
}

/** Mongo results are compared as documents, so field order in a projection doesn't matter. */
function mongoRows(s: SqlResultSet): Row[] {
  return docsToRows(s.rows.map((r) => Object.fromEntries(s.columns.map((c, i) => [c, r[i]]))));
}

const starterFor = (c: DbChallenge | null, mode: DbMode) => (c ? `${mode === "sql" ? "--" : "//"} ${c.prompt}\n${mode === "sql" ? "SELECT " : "db."}` : STARTERS[mode]);
const draftKey = (c: DbChallenge | null, mode: DbMode, dataset: string) => (c ? `db-lab:draft:${c.id}` : `db-lab:draft:free:${mode}:${dataset}`);

export function DbLab() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[calc(100dvh-15rem)] min-h-[560px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-hidden />;
  return <Lab />;
}

function Lab() {
  const modKey = useModKey();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [mode, setMode] = useState<DbMode>(() => (readPref("db-lab:mode") === "mongo" ? "mongo" : "sql"));
  const [datasetId, setDatasetId] = useState(() => {
    const saved = readPref("db-lab:dataset");
    const list = mode === "sql" ? SQL_DATASETS : MONGO_DATASETS;
    return list.some((d) => d.id === saved) ? saved! : list[0]!.id;
  });
  const [active, setActive] = useState<DbChallenge | null>(null);
  const [code, setCodeState] = useState(() => readPref(draftKey(null, mode, datasetId)) ?? STARTERS[mode]);
  const [running, setRunning] = useState<"run" | "check" | null>(null);
  const [output, setOutput] = useState<QueryOutput | null>(null);
  const [outputTitle, setOutputTitle] = useState<string | undefined>(undefined);
  const [expected, setExpected] = useState<QueryOutput | null>(null);
  const [verdict, setVerdict] = useState<QueryVerdict | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("challenges");
  const [bottomTab, setBottomTab] = useState<BottomTab>("result");
  const [mobilePane, setMobilePane] = useState<MobilePane>("query");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const [query, setQuery] = useState("");
  const [solved, setSolved] = useState<Set<string>>(() => new Set(loadList(SOLVED_KEY)));
  const [history, setHistory] = useState<string[]>(() => loadList(`db-lab:history:${mode}`));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const datasets = mode === "sql" ? SQL_DATASETS : MONGO_DATASETS;
  // The catalogue spans every dataset of the language: picking a challenge switches to the data it runs on.
  const challenges = useMemo(() => DB_CHALLENGES.filter((c) => c.mode === mode), [mode]);
  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const label = (id: string) => datasets.find((d) => d.id === id)?.label ?? id;
    return challenges.filter((c) => {
      if (filter !== "all" && c.difficulty !== filter) return false;
      if (terms.length === 0) return true;
      const hay = `${c.title} ${topicLabel(mode, c.topic)} ${c.concepts.join(" ")} ${label(c.dataset)}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [challenges, filter, query, mode, datasets]);
  const groups = useMemo(() => groupByTopic(mode, visible, solved), [mode, visible, solved]);
  const tables = useMemo(() => (mode === "sql" ? parseSchema(sqlDataset(datasetId).seed) : []), [mode, datasetId]);
  const collections = useMemo(() => (mode === "mongo" ? mongoDataset(datasetId).collections : {}), [mode, datasetId]);
  const solvedHere = useMemo(() => challenges.filter((c) => solved.has(c.id)).length, [challenges, solved]);
  const blurb = datasets.find((d) => d.id === datasetId)?.blurb;

  function setCode(next: string) {
    setCodeState(next);
    clearTimeout(saveTimer.current);
    const key = draftKey(active, mode, datasetId);
    const starter = starterFor(active, mode);
    saveTimer.current = setTimeout(() => writePref(key, next === starter ? null : next), 400);
  }

  function clearFeedback() {
    setOutput(null);
    setOutputTitle(undefined);
    setExpected(null);
    setVerdict(null);
    setShowHint(false);
    setShowSolution(false);
    setBottomTab("result");
  }

  function load(c: DbChallenge | null, m: DbMode, ds: string) {
    clearTimeout(saveTimer.current);
    setActive(c);
    setCodeState(readPref(draftKey(c, m, ds)) ?? starterFor(c, m));
    clearFeedback();
  }

  function switchMode(next: DbMode) {
    if (next === mode) return;
    const ds = (next === "sql" ? SQL_DATASETS : MONGO_DATASETS)[0]!.id;
    setMode(next);
    setDatasetId(ds);
    setHistory(loadList(`db-lab:history:${next}`));
    writePref("db-lab:mode", next);
    writePref("db-lab:dataset", ds);
    load(null, next, ds);
  }

  function switchDataset(id: string) {
    setDatasetId(id);
    writePref("db-lab:dataset", id);
    load(null, mode, id);
  }

  function pick(c: DbChallenge) {
    if (c.dataset !== datasetId) {
      setDatasetId(c.dataset);
      writePref("db-lab:dataset", c.dataset);
    }
    load(c, mode, c.dataset);
    setMobilePane("query");
  }

  async function execute(source: string, fresh = false): Promise<QueryOutput> {
    if (mode === "mongo") {
      const started = performance.now();
      const res = runMongo(source, collections);
      if (!res.ok) return { kind: "error", message: res.error };
      return { kind: "sets", sets: [docsToSet(res.docs)], ms: Math.max(1, Math.round(performance.now() - started)) };
    }
    return runQuery(sqlDataset(datasetId).seed, source, { fresh });
  }

  function remember(source: string) {
    const entry = source.trim();
    const next = [entry, ...history.filter((h) => h !== entry)].slice(0, HISTORY_MAX);
    setHistory(next);
    writePref(`db-lab:history:${mode}`, JSON.stringify(next));
  }

  async function run() {
    if (running) return;
    if (isBlankQuery(code, mode)) return void toast.message("Write a query first.");
    setRunning("run");
    setVerdict(null);
    const out = await execute(code);
    setOutput(out);
    setOutputTitle(undefined);
    setBottomTab("result");
    if (out.kind === "sets") remember(code);
    setRunning(null);
  }

  async function preview(name: string) {
    if (running) return;
    setRunning("run");
    const out = await execute(mode === "sql" ? `SELECT * FROM ${name} LIMIT 100` : `db.${name}.find()`);
    setOutput(out);
    setOutputTitle(`Preview: ${name}`);
    setVerdict(null);
    setBottomTab("result");
    setMobilePane("query");
    setRunning(null);
  }

  async function showExpected() {
    if (!active || running) return;
    setRunning("check");
    const ref = await execute(active.solution, true);
    if (mode === "sql") resetSqlDatabase();
    setExpected(ref);
    setRunning(null);
  }

  async function check() {
    if (!active || running) return;
    if (isBlankQuery(code, mode)) return void toast.message("Write a query first.");
    setRunning("check");
    const mine = await execute(code, true);
    const ref = await execute(active.solution, true);
    if (mode === "sql") resetSqlDatabase();
    setOutput(mine);
    setOutputTitle("Your output");
    setExpected(ref);
    setBottomTab("result");
    setRunning(null);
    let v: QueryVerdict;
    if (mode === "mongo" && mine.kind === "sets" && ref.kind === "sets") {
      const r = compareRows(mongoRows(mine.sets.at(-1)!), mongoRows(ref.sets.at(-1)!), active.ordered);
      v = r.ok ? { ok: true, text: "Your documents match the expected result." } : { ok: false, text: r.reason };
    } else v = judgeOutputs(mine, ref, active.ordered);
    setVerdict(v);
    if (v.ok) {
      const next = new Set(solved).add(active.id);
      setSolved(next);
      writePref(SOLVED_KEY, JSON.stringify([...next]));
      toast.success(`Solved: ${active.title}`);
    } else if (mine.kind === "sets") remember(code);
  }

  function nextChallenge() {
    // Teaching order (topic by topic, easy before hard), not the order the data was written in.
    const sequence = groupByTopic(mode, challenges, solved).flatMap((g) => g.challenges);
    const next = nextUnsolved(sequence, solved, active?.id ?? null);
    if (next) pick(next);
  }

  function resetQuery() {
    if (code !== starterFor(active, mode) && !window.confirm("Clear your query and start over?")) return;
    setCode(starterFor(active, mode));
    clearFeedback();
  }

  function resetData() {
    resetSqlDatabase();
    clearFeedback();
    toast.success("Database reset to its starting data");
  }

  const datasetLabel = (id: string) => datasets.find((d) => d.id === id)?.label ?? id;
  const challengeList = (
    <ChallengeCatalog groups={groups} activeId={active?.id ?? null} solved={solved} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} onPick={pick} datasetLabel={datasetLabel} total={challenges.length} />
  );

  const schema = mode === "sql" ? <SqlSchemaBrowser tables={tables} onPreview={(t) => void preview(t)} /> : <MongoSchemaBrowser collections={collections} onPreview={(n) => void preview(n)} />;

  const sidebar = (
    <Tabs value={sideTab} onValueChange={(v) => setSideTab(v as SideTab)} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex shrink-0 items-center border-b bg-muted/30 px-2 py-1.5">
        <CompactTabsList>
          <CompactTabsTrigger value="challenges">
            <ListChecks className="size-3.5" /> Challenges
            <span className="font-mono text-2xs text-muted-foreground tabular">
              {solvedHere}/{challenges.length}
            </span>
          </CompactTabsTrigger>
          <CompactTabsTrigger value="schema">
            <Table2 className="size-3.5" /> {mode === "sql" ? "Tables" : "Collections"}
          </CompactTabsTrigger>
        </CompactTabsList>
      </div>
      <TabsContent value="challenges" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {challengeList}
      </TabsContent>
      <TabsContent value="schema" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {schema}
      </TabsContent>
    </Tabs>
  );

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 px-1 text-xs">
        <Target className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate font-medium">{active ? active.title : "Free query"}</span>
        {active && (
          <Button type="button" size="icon-sm" variant="ghost" className="size-6" onClick={() => load(null, mode, datasetId)} aria-label="Leave challenge, back to a free query" title="Back to free query">
            <X />
          </Button>
        )}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={resetQuery} aria-label="Clear the query and start over" title="Start over">
        <Eraser />
      </Button>
      {mode === "sql" && (
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={resetData} title="Undo any INSERT/UPDATE/DELETE you ran">
          <RotateCcw /> <span className="hidden sm:inline">Reset data</span>
        </Button>
      )}
      <Button type="button" variant={active ? "outline" : "default"} size="sm" className="h-8" onClick={run} disabled={running !== null} title={`Run (${modKey} + Enter)`}>
        {running === "run" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />} Run
      </Button>
      {active && (
        <Button type="button" size="sm" className="h-8" onClick={check} disabled={running !== null} title={`Check answer (${modKey} + Shift + Enter)`}>
          {running === "check" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />} Check
        </Button>
      )}
    </div>
  );

  const challengeCard = active && (
    <div className="shrink-0 space-y-2 border-b px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={active.difficulty} />
        {solved.has(active.id) && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" aria-hidden /> Solved before
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>
            <Lightbulb /> {showHint ? "Hide hint" : "Hint"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => (showSolution || window.confirm("Look at the answer? Try the hint first.")) && setShowSolution((v) => !v)}
            aria-expanded={showSolution}
          >
            <Eye /> {showSolution ? "Hide answer" : "Answer"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-pretty">{active.prompt}</p>
      {showHint && <p className="rounded-md bg-info/10 px-2.5 py-1.5 text-sm text-info">{active.hint}</p>}
      {showSolution && <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2.5 font-mono text-xs whitespace-pre-wrap">{active.solution}</pre>}
    </div>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={setCode}
      onRun={run}
      onSubmit={active ? check : undefined}
      language={mode === "sql" ? "sql" : "javascript"}
      fontSize={14}
      fill={desktop}
      minHeight="220px"
      ariaLabel={mode === "sql" ? "SQL editor" : "Mongo query editor"}
      className="rounded-none border-0"
    />
  );

  const bottom = (
    <Tabs value={bottomTab} onValueChange={(v) => setBottomTab(v as BottomTab)} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 items-center border-y bg-muted/30 px-2 py-1">
        <CompactTabsList>
          <CompactTabsTrigger value="result">
            Result
            {output && <span className={cn("size-1.5 rounded-full", output.kind === "error" || verdict?.ok === false ? "bg-destructive" : "bg-success")} aria-hidden />}
          </CompactTabsTrigger>
          {active && <CompactTabsTrigger value="expected">Expected</CompactTabsTrigger>}
          <CompactTabsTrigger value="history">
            <History className="size-3.5" /> History
          </CompactTabsTrigger>
        </CompactTabsList>
        <span className="ml-auto hidden text-2xs text-muted-foreground sm:inline">
          <kbd className="rounded border bg-background px-1 font-mono">{modKey}</kbd> <kbd className="rounded border bg-background px-1 font-mono">Enter</kbd> run
          {active && (
            <>
              {" · "}
              <kbd className="rounded border bg-background px-1 font-mono">{modKey}</kbd> <kbd className="rounded border bg-background px-1 font-mono">Shift</kbd>{" "}
              <kbd className="rounded border bg-background px-1 font-mono">Enter</kbd> check
            </>
          )}
        </span>
      </div>
      <div className={cn("min-h-0 flex-1 p-3", desktop && "overflow-y-auto overscroll-contain")}>
        <TabsContent value="result" className="space-y-3">
          {verdict && (
            <div className="space-y-2">
              <VerdictBanner verdict={verdict} />
              {verdict.ok && (
                <Button type="button" size="sm" variant="secondary" onClick={nextChallenge}>
                  Next challenge <ArrowRight />
                </Button>
              )}
              {!verdict.ok && expected && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setBottomTab("expected")}>
                  Compare with the expected output <ArrowRight />
                </Button>
              )}
            </div>
          )}
          <QueryOutputView
            output={output}
            running={running !== null}
            title={outputTitle}
            emptyHint={
              <>
                <p>Run a query to see rows here.</p>
                <p className="text-xs">Tip: the eye icon next to a {mode === "sql" ? "table" : "collection"} previews its data without touching your editor.</p>
              </>
            }
          />
        </TabsContent>
        {active && (
          <TabsContent value="expected">
            {expected ? (
              <QueryOutputView output={expected} running={false} title="Expected output" emptyHint={null} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
                <p>See the rows a correct answer returns, without the query.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void showExpected()} disabled={running !== null}>
                  <Eye /> Show expected output
                </Button>
              </div>
            )}
          </TabsContent>
        )}
        <TabsContent value="history">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Queries you run show up here. Click one to load it back into the editor.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    onClick={() => {
                      setCode(h);
                      setBottomTab("result");
                    }}
                    className="block w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="line-clamp-2 whitespace-pre-wrap">{h}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <div data-ide className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <div role="group" aria-label="Query language" className="flex rounded-lg bg-muted p-[3px]">
          {(
            [
              ["sql", "SQL"],
              ["mongo", "MongoDB"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => switchMode(id)}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                mode === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="db-lab-dataset">
          Dataset
        </label>
        <select
          id="db-lab-dataset"
          value={datasetId}
          onChange={(e) => switchDataset(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">{blurb}</span>
        <div className="ml-auto flex items-center gap-2 text-xs" title={`${solvedHere} of ${challenges.length} challenges solved`}>
          <span className="text-muted-foreground">Solved</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-success transition-[width]" style={{ width: `${challenges.length ? (solvedHere / challenges.length) * 100 : 0}%` }} />
          </span>
          <span className="font-mono tabular">
            {solvedHere}/{challenges.length}
          </span>
        </div>
      </div>

      {!desktop && (
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-[3px]" role="tablist" aria-label="Lab sections">
          {(["query", "challenges", "schema"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={mobilePane === p}
              onClick={() => setMobilePane(p)}
              className={cn("min-h-9 rounded-md text-sm", mobilePane === p ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
            >
              {p === "query" ? "Query" : p === "challenges" ? `Challenges ${solvedHere}/${challenges.length}` : mode === "sql" ? "Tables" : "Collections"}
            </button>
          ))}
        </div>
      )}

      {desktop ? (
        <div className="grid h-[calc(100dvh-15rem)] min-h-[560px] grid-cols-[300px_minmax(0,1fr)] gap-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Challenges and schema">
            {sidebar}
          </aside>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Query editor">
            {toolbar}
            {challengeCard}
            <div className="min-h-0 flex-1">
              <ResizablePanelGroup storageId="db-lab:editor-results" orientation="vertical">
                <ResizablePanel id="editor" defaultSize="45" minSize="20">
                  {editor}
                </ResizablePanel>
                <ResizableHandle orientation="vertical" />
                <ResizablePanel id="results" defaultSize="55" minSize="15">
                  {bottom}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </section>
        </div>
      ) : (
        <>
          {mobilePane === "challenges" && <div className="rounded-xl border bg-card p-3">{challengeList}</div>}
          {mobilePane === "schema" && <div className="rounded-xl border bg-card p-3">{schema}</div>}
          <section className={cn("overflow-hidden rounded-xl border bg-card", mobilePane !== "query" && "hidden")} aria-label="Query editor">
            {toolbar}
            {challengeCard}
            {editor}
            {bottom}
          </section>
        </>
      )}
    </div>
  );
}
