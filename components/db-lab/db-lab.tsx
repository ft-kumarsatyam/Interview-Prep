"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Eye, Lightbulb, ListChecks, Loader2, Play, RotateCcw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MONGO_DATASETS,
  SQL_DATASETS,
  STARTERS,
  challengesFor,
  compareRows,
  docsToRows,
  mongoDataset,
  sqlDataset,
  type Cell,
  type DbChallenge,
  type DbMode,
  type Row,
} from "@/lib/domain/db-lab";
import { runMongo } from "@/lib/domain/mongo-query";
import { resetSqlDatabase, runSql, type SqlResultSet } from "@/lib/sandbox/sql-run";
import { cn } from "@/lib/utils";
import { CodeEditor } from "@/components/playground/code-editor";
import { useModKey } from "@/components/playground/use-mod-key";
import { ResultTable } from "./result-table";

type Pane = "query" | "challenges" | "schema";
type Output = { kind: "sets"; sets: SqlResultSet[]; ms: number } | { kind: "error"; message: string };

const SOLVED_KEY = "prepos:db-lab:solved";

function loadSolved(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveSolved(s: Set<string>) {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...s]));
  } catch {
    // Private windows can refuse storage; progress just won't persist.
  }
}

/** Table name and column list for each CREATE TABLE in a seed script. */
function sqlSchema(seed: string): Array<{ table: string; columns: string[] }> {
  return [...seed.matchAll(/CREATE TABLE (\w+) \(([^;]*)\);/g)].map((m) => ({
    table: m[1]!,
    columns: (m[2] ?? "")
      .split(/,(?![^()]*\))/)
      .map((c) => c.trim())
      .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE)\b/i.test(c)),
  }));
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

export function DbLab() {
  const modKey = useModKey();
  const [mode, setMode] = useState<DbMode>("sql");
  const [datasetId, setDatasetId] = useState("company");
  const [code, setCode] = useState(STARTERS.sql);
  const [pane, setPane] = useState<Pane>("query");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [active, setActive] = useState<DbChallenge | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const [solved, setSolved] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : loadSolved()));

  // On a phone the results land below the fold after Run, so bring them into view.
  useEffect(() => {
    if (output) outputRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [output]);

  const datasets = mode === "sql" ? SQL_DATASETS : MONGO_DATASETS;
  const challenges = useMemo(() => challengesFor(mode, datasetId), [mode, datasetId]);
  const schema = useMemo(() => (mode === "sql" ? sqlSchema(sqlDataset(datasetId).seed) : []), [mode, datasetId]);
  const collections = useMemo(() => (mode === "mongo" ? mongoDataset(datasetId).collections : {}), [mode, datasetId]);

  function clearFeedback() {
    setOutput(null);
    setVerdict(null);
    setShowHint(false);
    setShowSolution(false);
  }

  function switchMode(next: DbMode) {
    if (next === mode) return;
    setMode(next);
    setDatasetId(next === "sql" ? "company" : "shop");
    setCode(STARTERS[next]);
    setActive(null);
    clearFeedback();
  }

  function switchDataset(id: string) {
    setDatasetId(id);
    setCode(STARTERS[mode]);
    setActive(null);
    clearFeedback();
  }

  function pick(c: DbChallenge) {
    setActive(c);
    clearFeedback();
    const comment = mode === "sql" ? "--" : "//";
    setCode(`${comment} ${c.prompt}\n${mode === "sql" ? "SELECT " : "db."}`);
    setPane("query");
  }

  async function execute(source: string, fresh = false): Promise<Output> {
    if (mode === "mongo") {
      const started = performance.now();
      const res = runMongo(source, collections);
      if (!res.ok) return { kind: "error", message: res.error };
      return { kind: "sets", sets: [docsToSet(res.docs)], ms: Math.max(1, Math.round(performance.now() - started)) };
    }
    const res = await runSql(sqlDataset(datasetId).seed, source, { fresh });
    return res.ok ? { kind: "sets", sets: res.sets, ms: res.ms } : { kind: "error", message: res.error };
  }

  async function run() {
    if (running || !code.trim()) return;
    setRunning(true);
    setVerdict(null);
    const out = await execute(code);
    setOutput(out);
    setRunning(false);
  }

  async function check() {
    if (!active || running) return;
    setRunning(true);
    const mine = await execute(code, true);
    setOutput(mine);
    if (mine.kind === "error") {
      setVerdict({ ok: false, text: "Your query has an error. Fix it, then check again." });
      return setRunning(false);
    }
    const reference = await execute(active.solution, true);
    setRunning(false);
    if (reference.kind === "error") return setVerdict({ ok: false, text: "Couldn't evaluate the reference answer. Try again." });
    const last = <T,>(sets: T[]) => sets.at(-1);
    const mineSet = last(mine.sets);
    const refSet = last(reference.sets);
    if (!mineSet || !refSet) return setVerdict({ ok: false, text: "Your query returned no result set. Use SELECT (or find/aggregate)." });
    const asRows = (s: SqlResultSet) => (mode === "mongo" ? docsToRows(JSON.parse(JSON.stringify(s.rows.map((r) => Object.fromEntries(s.columns.map((c, i) => [c, r[i]])))))) : s.rows);
    const result = compareRows(asRows(mineSet), asRows(refSet), active.ordered);
    if (result.ok) {
      setVerdict({ ok: true, text: "Correct. Your result matches the reference." });
      const next = new Set(solved).add(active.id);
      setSolved(next);
      saveSolved(next);
      toast.success("Solved");
    } else setVerdict({ ok: false, text: result.reason });
  }

  function resetData() {
    resetSqlDatabase();
    clearFeedback();
    toast.success("Database reset to its starting data");
  }

  const solvedHere = challenges.filter((c) => solved.has(c.id)).length;

  const left = (
    <div className={cn("min-w-0 space-y-4", pane === "query" && "hidden lg:block")}>
      <section className={cn(pane === "schema" && "hidden lg:block")} aria-label="Challenges">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" aria-hidden /> Challenges
          <span className="tabular ml-auto font-mono text-xs font-normal text-muted-foreground">
            {solvedHere}/{challenges.length}
          </span>
        </h2>
        <ul className="space-y-1">
          {challenges.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                aria-current={active?.id === c.id ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active?.id === c.id && "border-primary/50 bg-primary/5",
                )}
              >
                {solved.has(c.id) ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Solved" /> : <span className="mt-0.5 size-4 shrink-0 rounded-full border" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.difficulty} · {c.concepts.slice(0, 2).join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(pane === "challenges" && "hidden lg:block")} aria-label="Schema">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Table2 className="size-4 text-primary" aria-hidden /> {mode === "sql" ? "Tables" : "Collections"}
        </h2>
        <div className="space-y-2">
          {mode === "sql"
            ? schema.map((t) => (
                <div key={t.table} className="rounded-lg border p-2.5">
                  <p className="font-mono text-xs font-semibold">{t.table}</p>
                  <ul className="mt-1 space-y-0.5 font-mono text-2xs text-muted-foreground">
                    {t.columns.map((c) => (
                      <li key={c} className="truncate">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            : Object.entries(collections).map(([name, docs]) => (
                <div key={name} className="rounded-lg border p-2.5">
                  <p className="font-mono text-xs font-semibold">
                    {name} <span className="font-normal text-muted-foreground">({docs.length} docs)</span>
                  </p>
                  <pre className="mt-1 overflow-x-auto font-mono text-2xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify(docs[0])}</pre>
                </div>
              ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={mode} onValueChange={(v) => switchMode(v as DbMode)}>
          <TabsList aria-label="Query language">
            <TabsTrigger value="sql">SQL</TabsTrigger>
            <TabsTrigger value="mongo">MongoDB</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dataset">
          {datasets.map((d) => (
            <Chip key={d.id} pressed={d.id === datasetId} onClick={() => switchDataset(d.id)} title={d.blurb}>
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border p-1 lg:hidden" role="tablist" aria-label="Lab sections">
        {(["query", "challenges", "schema"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={pane === p}
            onClick={() => setPane(p)}
            className={cn("min-h-9 rounded-md text-sm capitalize", pane === p ? "bg-muted font-medium" : "text-muted-foreground")}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {left}

        <div className={cn("min-w-0 space-y-3", pane !== "query" && "hidden lg:block")}>
          {active && (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <p className="text-sm">
                <span className="font-semibold">{active.title}.</span> {active.prompt}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>
                  <Lightbulb /> {showHint ? "Hide hint" : "Hint"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => (showSolution || window.confirm("Look at the answer? Try the hint first.")) && setShowSolution((v) => !v)}
                  aria-expanded={showSolution}
                >
                  <Eye /> {showSolution ? "Hide answer" : "Show answer"}
                </Button>
              </div>
              {showHint && <p className="text-sm text-muted-foreground">{active.hint}</p>}
              {showSolution && <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-2.5 font-mono text-xs whitespace-pre-wrap">{active.solution}</pre>}
            </div>
          )}

          <CodeEditor value={code} onChange={setCode} onRun={run} language={mode === "sql" ? "sql" : "javascript"} minHeight="180px" ariaLabel={mode === "sql" ? "SQL editor" : "Mongo query editor"} />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={run} disabled={running} className="h-10">
              {running ? <Loader2 className="animate-spin" /> : <Play />} Run
            </Button>
            {active && (
              <Button type="button" variant="secondary" onClick={check} disabled={running} className="h-10">
                <Check /> Check answer
              </Button>
            )}
            {mode === "sql" && (
              <Button type="button" variant="ghost" onClick={resetData} className="h-10">
                <RotateCcw /> Reset data
              </Button>
            )}
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-2xs">{modKey}</kbd> + <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-2xs">Enter</kbd> to run
            </span>
          </div>

          {verdict && (
            <p
              role="status"
              className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", verdict.ok ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10")}
            >
              {verdict.ok ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
              {verdict.text}
            </p>
          )}

          <div ref={outputRef} className="space-y-3 scroll-mb-24">
          {output?.kind === "error" && (
            <pre role="alert" className="overflow-x-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">
              {output.message}
            </pre>
          )}
          {output?.kind === "sets" && (
            <div className="space-y-3">
              {output.sets.length === 0 && <p className="text-sm text-muted-foreground">Done in {output.ms} ms. The statement returned no rows.</p>}
              {output.sets.map((s, i) => (
                <ResultTable key={i} columns={s.columns} rows={s.rows} total={s.total} label={`Result ${i + 1}`} />
              ))}
              {output.sets.length > 0 && <p className="text-xs text-muted-foreground">{output.ms} ms</p>}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
