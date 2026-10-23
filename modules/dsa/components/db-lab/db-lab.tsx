"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { ArrowRight, BookmarkPlus, Check, Eraser, Eye, History, Lightbulb, ListChecks, Loader2, Play, RotateCcw, Send, Table2, Target, Workflow, X } from "lucide-react";
import { toast } from "sonner";
import { CodeEditor } from "@/modules/dsa/components/playground/lazy-code-editor";
import { useModKey } from "@/modules/dsa/components/playground/use-mod-key";
import { DESKTOP_QUERY, readPref, useHydrated, useMediaQuery, writePref } from "@/modules/dsa/components/ide/use-client-prefs";
import { RunHistory } from "@/modules/dsa/components/ide/run-history";
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
import { ENGINES, challengeMode, checkEngine, engineLabel, fromSavedMode, toSavedMode, type DbEngine, type SavedMode } from "@/modules/dsa/domain/db-dialect";
import { PG_COLUMNS_SQL, PG_FKS_SQL, SQLITE_COLUMNS_SQL, SQLITE_FKS_SQL, buildEr, erFromPostgres, erFromSeedTables, erFromSqlite } from "@/modules/dsa/domain/db-er";
import { explainStatement, parsePlan } from "@/modules/dsa/domain/db-explain";
import { MAX_TABS, addTab, closeTab, initialTabs, newTabId, openTab, parseTabs, renameTab, updateTab, type TabsState } from "@/modules/dsa/domain/db-lab-tabs";
import { localOnlySolved, mergeSolved } from "@/modules/dsa/domain/db-lab-progress";
import { runMongo } from "@/modules/dsa/domain/mongo-query";
import { parseSchema } from "@/modules/dsa/domain/sql-schema";
import { judgeOutputs, resetEngines, runOn, runQuery, type QueryOutput, type QueryVerdict } from "@/core/sandbox/sql-judge";
import { getPgProgress, onPgProgress, preloadPg, type PgProgress } from "@/core/sandbox/pg-run";
import type { SqlResultSet } from "@/core/sandbox/sql-run";
import { cn } from "@/core/utils";
import { deleteQueryAction, importSolvedAction, markSolvedAction, recordRunAction, saveQueryAction } from "@/app/(app)/playground/code-lab-actions";
import { QueryOutputView, VerdictBanner } from "@/modules/dsa/components/db-lab/query-output";
import { MongoSchemaBrowser, SqlSchemaBrowser } from "@/modules/dsa/components/db-lab/schema-browser";
import { ChallengeCatalog, type CatalogFilter } from "@/modules/dsa/components/db-lab/challenge-catalog";
import { EngineStatus } from "@/modules/dsa/components/db-lab/engine-status";
import { ErView, type ErState } from "@/modules/dsa/components/db-lab/er-view";
import { PlanView, type PlanState } from "@/modules/dsa/components/db-lab/plan-view";
import { QueryTabs } from "@/modules/dsa/components/db-lab/query-tabs";
import { SavedQueries, type SavedItem } from "@/modules/dsa/components/db-lab/saved-queries";
import { groupByTopic, nextUnsolved, topicLabel } from "@/modules/dsa/domain/db-lab-topics";

/** A saved query as the page loads it (same shape the database service returns). */
export interface SavedQueryRow {
  id: string;
  title: string;
  sql: string;
  mode: SavedMode;
  dataset: string;
  updatedAt: string;
}
export interface SolvedRow {
  challengeId: string;
  mode: SavedMode;
}
export type MermaidComponent = ComponentType<{ code: string; label: string }>;

type SideTab = "challenges" | "saved" | "schema";
type BottomTab = "result" | "plan" | "expected" | "history";
type MobilePane = "query" | "challenges" | "saved" | "schema";

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

function execMongo(source: string, collections: Parameters<typeof runMongo>[1]): QueryOutput {
  const started = performance.now();
  const res = runMongo(source, collections);
  if (!res.ok) return { kind: "error", message: res.error };
  return { kind: "sets", sets: [docsToSet(res.docs)], ms: Math.max(1, Math.round(performance.now() - started)) };
}

const POSTGRES_STARTER = "-- Cmd/Ctrl + Enter to run. Real PostgreSQL (PGlite) in your browser.\nSELECT * FROM employees LIMIT 5;";
const freeStarter = (engine: DbEngine) => (engine === "postgres" ? POSTGRES_STARTER : STARTERS[challengeMode(engine)]);
const starterFor = (c: DbChallenge | null, engine: DbEngine) => (c ? `${engine === "mongo" ? "//" : "--"} ${c.prompt}\n${engine === "mongo" ? "db." : "SELECT "}` : freeStarter(engine));
const challengeDraftKey = (c: DbChallenge) => `db-lab:draft:${c.id}`;
const tabsKey = (engine: DbEngine) => `db-lab:tabs:${engine}`;
const datasetsFor = (engine: DbEngine) => (engine === "mongo" ? MONGO_DATASETS : SQL_DATASETS);
const validDataset = (engine: DbEngine, id: string | null | undefined) => (datasetsFor(engine).some((d) => d.id === id) ? id! : datasetsFor(engine)[0]!.id);

function readEngine(start: DbChallenge | null): DbEngine {
  if (start?.mode === "mongo") return "mongo";
  const saved = readPref("db-lab:mode");
  if (start) return saved === "postgres" ? "postgres" : "sqlite";
  return saved === "mongo" ? "mongo" : saved === "postgres" ? "postgres" : "sqlite";
}

/** The tabs saved for an engine, or one tab seeded from the single free draft older versions kept. */
function loadTabs(engine: DbEngine, preferredDataset: string | null): TabsState {
  const stored = parseTabs(readPref(tabsKey(engine)));
  if (stored) return { ...stored, tabs: stored.tabs.map((t) => ({ ...t, dataset: validDataset(engine, t.dataset) })) };
  const ds = validDataset(engine, preferredDataset);
  const legacy = readPref(`db-lab:draft:free:${challengeMode(engine)}:${ds}`);
  return initialTabs(legacy ?? freeStarter(engine), ds);
}

/** `initialChallenge` (from `?challenge=`) opens that challenge on its dataset, e.g. from the SQL sheet. */
export function DbLab({ initialChallenge, savedQueries, solved, ErDiagram }: { initialChallenge?: string; savedQueries: SavedQueryRow[]; solved: SolvedRow[]; ErDiagram: MermaidComponent }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[calc(100dvh-15rem)] min-h-[560px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-busy aria-label="Loading DB Lab" />;
  return <Lab start={DB_CHALLENGES.find((c) => c.id === initialChallenge) ?? null} savedQueries={savedQueries} serverSolved={solved} ErDiagram={ErDiagram} />;
}

function Lab({ start, savedQueries, serverSolved, ErDiagram }: { start: DbChallenge | null; savedQueries: SavedQueryRow[]; serverSolved: SolvedRow[]; ErDiagram: MermaidComponent }) {
  const modKey = useModKey();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [engine, setEngine] = useState<DbEngine>(() => readEngine(start));
  const [tabsState, setTabsState] = useState<TabsState>(() => {
    const e = readEngine(start);
    return loadTabs(e, start ? start.dataset : readPref("db-lab:dataset"));
  });
  const [datasetId, setDatasetId] = useState(() => {
    if (start) return start.dataset;
    const e = readEngine(start);
    const tabs = loadTabs(e, readPref("db-lab:dataset"));
    return tabs.tabs.find((t) => t.id === tabs.active)!.dataset;
  });
  const [active, setActive] = useState<DbChallenge | null>(start);
  const [code, setCodeState] = useState(() => {
    if (start) return readPref(challengeDraftKey(start)) ?? starterFor(start, readEngine(start));
    const tabs = loadTabs(readEngine(start), readPref("db-lab:dataset"));
    return tabs.tabs.find((t) => t.id === tabs.active)!.code;
  });
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
  const [solved, setSolved] = useState<Set<string>>(() => mergeSolved(serverSolved, loadList(SOLVED_KEY)));
  const [history, setHistory] = useState<string[]>(() => loadList(`db-lab:history:${challengeMode(readEngine(start))}`));
  const [saved, setSaved] = useState<SavedQueryRow[]>(savedQueries);
  const [propSaved, setPropSaved] = useState(savedQueries);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pgProgress, setPgProgress] = useState<PgProgress | null>(null);
  const [plan, setPlan] = useState<{ key: string; state: PlanState }>({ key: "", state: { status: "idle" } });
  const [er, setEr] = useState<{ key: string; state: ErState } | null>(null);
  const [runVersion, setRunVersion] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mode: DbMode = challengeMode(engine);

  // The page re-reads saved queries after a save; adopt the fresh list.
  if (propSaved !== savedQueries) {
    setPropSaved(savedQueries);
    setSaved(savedQueries);
  }

  const datasets = datasetsFor(engine);
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
  const activeTab = tabsState.tabs.find((t) => t.id === tabsState.active) ?? tabsState.tabs[0]!;
  const checkOn = active ? checkEngine(engine, active.id) : engine;
  const sqlEngine: Exclude<DbEngine, "mongo"> = engine === "postgres" ? "postgres" : "sqlite";
  const planKey = `${engine}|${datasetId}|${code}`;
  const erKey = `${engine}|${datasetId}`;
  const savedItems: SavedItem[] = useMemo(
    () => saved.map((s) => ({ id: s.id, title: s.title, sql: s.sql, engine: engineLabel(fromSavedMode(s.mode)), dataset: s.dataset ? ([...SQL_DATASETS, ...MONGO_DATASETS].find((d) => d.id === s.dataset)?.label ?? s.dataset) : "" })),
    [saved],
  );
  const linkKey = active ? `c:${active.id}` : tabsState.active;

  // Tabs live on the device; saved after a pause so typing stays cheap.
  useEffect(() => {
    const t = setTimeout(() => writePref(tabsKey(engine), JSON.stringify(tabsState)), 400);
    return () => clearTimeout(t);
  }, [engine, tabsState]);

  // Follow the Postgres engine's first-run download.
  useEffect(() => {
    if (engine !== "postgres") return;
    const off = onPgProgress(setPgProgress);
    void preloadPg().then(() => setPgProgress(getPgProgress()));
    return off;
  }, [engine]);

  // Solved progress lives in the database. Ids only this browser knew are sent once, then localStorage is just a cache.
  useEffect(() => {
    const local = loadList(SOLVED_KEY);
    const missing = localOnlySolved(serverSolved, local, (id) => DB_CHALLENGES.find((c) => c.id === id)?.mode ?? null);
    writePref(SOLVED_KEY, JSON.stringify([...mergeSolved(serverSolved, local)]));
    if (missing.length === 0) return;
    void importSolvedAction({ solved: missing }).then((res) => {
      if (!res.ok) toast.error("Couldn't sync your solved challenges. They stay on this device for now.");
    });
  }, [serverSolved]);

  function setCode(next: string) {
    setCodeState(next);
    if (active) {
      clearTimeout(saveTimer.current);
      const starter = starterFor(active, engine);
      saveTimer.current = setTimeout(() => writePref(challengeDraftKey(active), next === starter ? null : next), 400);
    } else {
      setTabsState((s) => updateTab(s, s.active, { code: next }));
    }
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

  /** Shows a free-query tab: its code and dataset, with no challenge open. */
  function showTab(state: TabsState, id: string, targetEngine: DbEngine = engine) {
    clearTimeout(saveTimer.current);
    const tab = state.tabs.find((t) => t.id === id) ?? state.tabs[0]!;
    setTabsState({ ...state, active: tab.id });
    setActive(null);
    setCodeState(tab.code);
    setDatasetId(validDataset(targetEngine, tab.dataset));
    writePref("db-lab:dataset", validDataset(targetEngine, tab.dataset));
    clearFeedback();
  }

  function switchEngine(next: DbEngine) {
    if (next === engine) return;
    const st = loadTabs(next, null);
    setEngine(next);
    setHistory(loadList(`db-lab:history:${challengeMode(next)}`));
    writePref("db-lab:mode", next);
    setEr(null);
    setPlan({ key: "", state: { status: "idle" } });
    setQuery("");
    showTab(st, st.active, next);
  }

  function switchDataset(id: string) {
    const nextTabs = updateTab(tabsState, tabsState.active, { dataset: id });
    showTab(nextTabs, tabsState.active);
  }

  function selectTab(id: string) {
    showTab(tabsState, id);
  }

  function newTab() {
    if (tabsState.tabs.length >= MAX_TABS) return void toast.message(`You can keep up to ${MAX_TABS} query tabs. Close one first.`);
    const next = addTab(tabsState, freeStarter(engine), datasetId);
    showTab(next, next.active);
    setMobilePane("query");
  }

  function closeQueryTab(id: string) {
    const tab = tabsState.tabs.find((t) => t.id === id);
    if (tab && tab.code.trim() && tab.code !== freeStarter(engine) && !window.confirm(`Close "${tab.name}"? Its query is not saved unless you used Save.`)) return;
    const next = closeTab(tabsState, id, freeStarter(engine), datasetId);
    if (active) setTabsState(next);
    else showTab(next, next.active);
  }

  function pick(c: DbChallenge) {
    clearTimeout(saveTimer.current);
    if (c.dataset !== datasetId) {
      setDatasetId(c.dataset);
      writePref("db-lab:dataset", c.dataset);
    }
    setActive(c);
    setCodeState(readPref(challengeDraftKey(c)) ?? starterFor(c, engine));
    clearFeedback();
    setMobilePane("query");
  }

  function leaveChallenge() {
    showTab(tabsState, tabsState.active);
  }

  function selectTabByIndex(i: number) {
    const t = tabsState.tabs[i];
    if (t) selectTab(t.id);
  }

  async function execute(source: string, fresh = false, on: DbEngine = engine): Promise<QueryOutput> {
    if (on === "mongo") return execMongo(source, collections);
    return runQuery(sqlDataset(datasetId).seed, source, { fresh, engine: on === "postgres" ? "postgres" : "sqlite" });
  }

  function remember(source: string) {
    const entry = source.trim();
    const next = [entry, ...history.filter((h) => h !== entry)].slice(0, HISTORY_MAX);
    setHistory(next);
    writePref(`db-lab:history:${mode}`, JSON.stringify(next));
  }

  /** Records counts and time only, never the query text. Failures are ignored. */
  function record(action: "run" | "check", ok: boolean, ms: number) {
    void recordRunAction({ kind: "dblab", ref: active?.id ?? `free:${engine}`, language: engine === "mongo" ? "mongo" : engine === "postgres" ? "postgres" : "sql", action, ok, passed: action === "check" && ok ? 1 : 0, total: action === "check" ? 1 : 0, ms: Math.round(ms) })
      .then(() => setRunVersion((v) => v + 1))
      .catch(() => undefined);
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
    record("run", out.kind === "sets", out.kind === "sets" ? out.ms : 0);
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
    const ref = await execute(active.solution, true, checkOn);
    if (mode === "sql") resetEngines();
    setExpected(ref);
    setRunning(null);
  }

  async function check() {
    if (!active || running) return;
    if (isBlankQuery(code, mode)) return void toast.message("Write a query first.");
    setRunning("check");
    const mine = await execute(code, true, checkOn);
    const ref = await execute(active.solution, true, checkOn);
    if (mode === "sql") resetEngines();
    setOutput(mine);
    setOutputTitle(checkOn === engine ? "Your output" : `Your output (checked on ${engineLabel(checkOn)})`);
    setExpected(ref);
    setBottomTab("result");
    setRunning(null);
    let v: QueryVerdict;
    if (mode === "mongo" && mine.kind === "sets" && ref.kind === "sets") {
      const r = compareRows(mongoRows(mine.sets.at(-1)!), mongoRows(ref.sets.at(-1)!), active.ordered);
      v = r.ok ? { ok: true, text: "Your documents match the expected result." } : { ok: false, text: r.reason };
    } else v = judgeOutputs(mine, ref, active.ordered);
    setVerdict(v);
    record("check", v.ok, mine.kind === "sets" ? mine.ms : 0);
    if (v.ok) {
      const next = new Set(solved).add(active.id);
      setSolved(next);
      writePref(SOLVED_KEY, JSON.stringify([...next]));
      toast.success(`Solved: ${active.title}`);
      void markSolvedAction({ challengeId: active.id, mode: active.mode }).then((res) => {
        if (!res.ok) toast.error("Solved here, but it couldn't be synced to your account.");
      });
    } else if (mine.kind === "sets") remember(code);
  }

  async function loadPlan() {
    if (engine === "mongo") return setPlan({ key: planKey, state: { status: "unavailable", message: "Query plans are shown for SQL and Postgres queries. The Mongo practice engine has no planner." } });
    const stmt = explainStatement(sqlEngine, code);
    if (!stmt) return setPlan({ key: planKey, state: { status: "unavailable", message: "Plans are shown for a single SELECT, WITH or VALUES statement. Write one in the editor to see how it would run." } });
    setPlan({ key: planKey, state: { status: "loading" } });
    const res = await runOn(sqlEngine, sqlDataset(datasetId).seed, stmt);
    if (!res.ok) return setPlan({ key: planKey, state: { status: "error", message: res.error } });
    const set = res.sets.at(-1);
    const parsed = set ? parsePlan(sqlEngine, sqlEngine === "sqlite" ? set.rows : set.rows[0]?.[0]) : null;
    setPlan({ key: planKey, state: parsed ? { status: "ready", plan: parsed } : { status: "error", message: "The engine returned something that is not a query plan." } });
  }

  function openBottom(v: BottomTab) {
    setBottomTab(v);
    if (v === "plan" && plan.key !== planKey) void loadPlan();
  }

  async function loadEr() {
    if (mode !== "sql") return;
    const key = erKey;
    setEr({ key, state: { status: "loading" } });
    const seed = sqlDataset(datasetId).seed;
    const colsSql = sqlEngine === "postgres" ? PG_COLUMNS_SQL : SQLITE_COLUMNS_SQL;
    const fksSql = sqlEngine === "postgres" ? PG_FKS_SQL : SQLITE_FKS_SQL;
    const cols = await runOn(sqlEngine, seed, colsSql);
    const fks = cols.ok ? await runOn(sqlEngine, seed, fksSql) : cols;
    let code: string;
    if (cols.ok && fks.ok && cols.sets[0]?.rows.length) {
      const build = sqlEngine === "postgres" ? erFromPostgres : erFromSqlite;
      code = buildEr(build(cols.sets[0].rows, fks.sets[0]?.rows ?? []));
    } else code = buildEr(erFromSeedTables(tables));
    setEr({ key, state: code ? { status: "ready", code } : { status: "error", message: "No tables to draw." } });
  }

  function nextChallenge() {
    // Teaching order (topic by topic, easy before hard), not the order the data was written in.
    const sequence = groupByTopic(mode, challenges, solved).flatMap((g) => g.challenges);
    const next = nextUnsolved(sequence, solved, active?.id ?? null);
    if (next) pick(next);
  }

  function resetQuery() {
    if (code !== starterFor(active, engine) && !window.confirm("Clear your query and start over?")) return;
    setCode(starterFor(active, engine));
    clearFeedback();
  }

  function resetData() {
    resetEngines();
    clearFeedback();
    toast.success("Database reset to its starting data");
  }

  async function save(asNew: boolean) {
    if (saving) return;
    if (isBlankQuery(code, mode)) return void toast.message("Write a query first.");
    const existing = asNew ? undefined : saved.find((s) => s.id === links[linkKey]);
    const title = existing?.title ?? window.prompt("Name this query", active ? active.title : activeTab.name)?.trim();
    if (!title) return;
    setSaving(true);
    const savedMode = toSavedMode(engine);
    const res = await saveQueryAction({ id: existing?.id, title, sql: code, mode: savedMode, dataset: datasetId });
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    const row: SavedQueryRow = { id: res.id, title, sql: code, mode: savedMode, dataset: datasetId, updatedAt: new Date().toISOString() };
    setSaved((list) => [row, ...list.filter((s) => s.id !== row.id)]);
    setLinks((l) => ({ ...l, [linkKey]: res.id }));
    toast.success(existing ? `Updated "${title}"` : `Saved "${title}"`);
  }

  function openSaved(item: SavedItem) {
    const row = saved.find((s) => s.id === item.id);
    if (!row) return;
    const target = fromSavedMode(row.mode);
    const base = target === engine ? tabsState : loadTabs(target, null);
    const tab = { id: newTabId(), name: row.title.slice(0, 24), code: row.sql, dataset: validDataset(target, row.dataset) };
    const next = openTab(base, tab);
    if (target !== engine) {
      setEngine(target);
      setHistory(loadList(`db-lab:history:${challengeMode(target)}`));
      writePref("db-lab:mode", target);
      setEr(null);
      setPlan({ key: "", state: { status: "idle" } });
    }
    showTab(next, next.active, target);
    setLinks((l) => ({ ...l, [next.active]: row.id }));
    setMobilePane("query");
  }

  async function renameSaved(item: SavedItem, title: string) {
    const row = saved.find((s) => s.id === item.id);
    if (!row) return;
    setSaving(true);
    const res = await saveQueryAction({ id: row.id, title, sql: row.sql, mode: row.mode, dataset: row.dataset });
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    setSaved((list) => list.map((s) => (s.id === row.id ? { ...s, title } : s)));
  }

  async function removeSaved(item: SavedItem) {
    setSaving(true);
    const res = await deleteQueryAction(item.id);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    setSaved((list) => list.filter((s) => s.id !== item.id));
    setLinks((l) => Object.fromEntries(Object.entries(l).filter(([, v]) => v !== item.id)));
    toast.success("Deleted");
  }

  // Keyboard shortcuts that work outside the editor too. The editor handles Mod+Enter itself and marks it handled.
  const latest = useRef({ run, check, save, selectTabByIndex, hasChallenge: false });
  useEffect(() => {
    latest.current = { run, check, save, selectTabByIndex, hasChallenge: active !== null };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const mod = e.metaKey || e.ctrlKey;
      const h = latest.current;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void h.save(e.shiftKey);
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          if (h.hasChallenge) void h.check();
        } else void h.run();
      } else if (e.altKey && !mod && /^Digit[1-6]$/.test(e.code)) {
        e.preventDefault();
        h.selectTabByIndex(Number(e.code.slice(5)) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const datasetLabel = (id: string) => datasets.find((d) => d.id === id)?.label ?? id;
  const challengeList = (
    <ChallengeCatalog groups={groups} activeId={active?.id ?? null} solved={solved} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} onPick={pick} datasetLabel={datasetLabel} total={challenges.length} />
  );

  const savedPanel = <SavedQueries items={savedItems} activeId={links[linkKey] ?? null} busy={saving} onLoad={openSaved} onRename={(i, t) => void renameSaved(i, t)} onDelete={(i) => void removeSaved(i)} onSaveCurrent={() => void save(false)} onSaveAs={() => void save(true)} modKey={modKey} />;

  const schema =
    mode === "sql" ? (
      <SqlSchemaBrowser
        key={erKey}
        tables={tables}
        onPreview={(t) => void preview(t)}
        onShowEr={() => er?.key !== erKey && void loadEr()}
        er={<ErView state={er?.key === erKey ? er.state : { status: "loading" }} Diagram={ErDiagram} />}
      />
    ) : (
      <MongoSchemaBrowser collections={collections} onPreview={(n) => void preview(n)} />
    );

  const schemaLabel = mode === "sql" ? "Tables" : "Collections";
  const sidebar = (
    <Tabs value={sideTab} onValueChange={(v) => setSideTab(v as SideTab)} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex shrink-0 items-center border-b bg-muted/30 px-2 py-1.5">
        <CompactTabsList className="grid w-full grid-cols-3">
          <CompactTabsTrigger value="challenges" title={`${solvedHere} of ${challenges.length} solved`}>
            Challenges
          </CompactTabsTrigger>
          <CompactTabsTrigger value="saved">
            Saved
            {saved.length > 0 && <span className="font-mono text-2xs text-muted-foreground tabular">{saved.length}</span>}
          </CompactTabsTrigger>
          <CompactTabsTrigger value="schema">{schemaLabel}</CompactTabsTrigger>
        </CompactTabsList>
      </div>
      <TabsContent value="challenges" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {challengeList}
      </TabsContent>
      <TabsContent value="saved" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {savedPanel}
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
        <span className="truncate font-medium">{active ? active.title : activeTab.name}</span>
        {active && (
          <Button type="button" size="icon-sm" variant="ghost" className="size-6" onClick={leaveChallenge} aria-label="Leave challenge, back to a free query" title="Back to free query">
            <X />
          </Button>
        )}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" className="size-8" onClick={resetQuery} aria-label="Clear the query and start over" title="Start over">
        <Eraser />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => void save(false)} disabled={saving} title={`Save query (${modKey} + S)`} aria-keyshortcuts="Control+S Meta+S">
        {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <BookmarkPlus />} <span className="hidden sm:inline">Save</span>
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

  const engineStatus = (
    <EngineStatus
      engineName={engine === "postgres" ? "PostgreSQL (PGlite)" : engine === "mongo" ? "the Mongo practice engine" : "SQLite (sql.js)"}
      detail="in your browser"
      progress={engine === "postgres" ? pgProgress : null}
      checkNote={active && engine === "postgres" && checkOn !== "postgres" ? "Check runs on SQLite: this reference answer uses SQLite-only functions." : active && engine === "postgres" ? "Check runs on Postgres." : null}
    />
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
      sqlDialect={engine === "postgres" ? "postgres" : "sqlite"}
      fontSize={14}
      fill={desktop}
      minHeight="220px"
      ariaLabel={engine === "postgres" ? "Postgres editor" : mode === "sql" ? "SQL editor" : "Mongo query editor"}
      className="rounded-none border-0"
    />
  );

  const kbd = "rounded border bg-background px-1 font-mono";
  const bottom = (
    <Tabs value={bottomTab} onValueChange={(v) => openBottom(v as BottomTab)} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 items-center border-y bg-muted/30 px-2 py-1">
        <CompactTabsList>
          <CompactTabsTrigger value="result">
            Result
            {output && <span className={cn("size-1.5 rounded-full", output.kind === "error" || verdict?.ok === false ? "bg-destructive" : "bg-success")} aria-hidden />}
          </CompactTabsTrigger>
          {mode === "sql" && (
            <CompactTabsTrigger value="plan">
              <Workflow className="size-3.5" /> Plan
            </CompactTabsTrigger>
          )}
          {active && <CompactTabsTrigger value="expected">Expected</CompactTabsTrigger>}
          <CompactTabsTrigger value="history">
            <History className="size-3.5" /> History
          </CompactTabsTrigger>
        </CompactTabsList>
        <span className="ml-auto hidden text-2xs text-muted-foreground lg:inline">
          <kbd className={kbd}>{modKey}</kbd> <kbd className={kbd}>Enter</kbd> run
          {active && (
            <>
              {" · "}
              <kbd className={kbd}>{modKey}</kbd> <kbd className={kbd}>Shift</kbd> <kbd className={kbd}>Enter</kbd> check
            </>
          )}
          {" · "}
          <kbd className={kbd}>{modKey}</kbd> <kbd className={kbd}>S</kbd> save
          {" · "}
          <kbd className={kbd}>Alt</kbd> <kbd className={kbd}>1-6</kbd> tabs
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
        {mode === "sql" && (
          <TabsContent value="plan" className="space-y-2">
            <PlanView state={plan.state} engineLabel={engine === "postgres" ? "Postgres" : "SQLite"} />
            {plan.state.status !== "loading" && plan.key !== planKey && plan.state.status !== "idle" && (
              <Button type="button" size="sm" variant="outline" onClick={() => void loadPlan()}>
                Explain the current query
              </Button>
            )}
          </TabsContent>
        )}
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
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Queries you run show up here. Click one to load it back into the editor.</p>
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
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">Recent runs ({active ? "this challenge" : "free queries"})</h3>
            <RunHistory kind="dblab" refKey={active?.id ?? `free:${engine}`} version={runVersion} />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );

  const progressTitle = `${solvedHere} of ${challenges.length} challenges solved`;
  const mobilePanes: [MobilePane, string][] = [
    ["query", "Query"],
    ["challenges", `Challenges ${solvedHere}/${challenges.length}`],
    ["saved", "Saved"],
    ["schema", schemaLabel],
  ];

  return (
    <div data-ide className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <div role="group" aria-label="Query engine" className="flex rounded-lg bg-muted p-[3px]">
          {ENGINES.map(({ id, label, blurb: b }) => (
            <button
              key={id}
              type="button"
              aria-pressed={engine === id}
              title={b}
              onClick={() => switchEngine(id)}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                engine === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label === "SQL" ? "SQLite" : label === "MongoDB" ? "MongoDB" : label}
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
        <div className="ml-auto flex items-center gap-2 text-xs" title={progressTitle}>
          <span className="text-muted-foreground">Solved</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={progressTitle} aria-valuemin={0} aria-valuemax={challenges.length} aria-valuenow={solvedHere}>
            <span className="block h-full rounded-full bg-success transition-[width] motion-reduce:transition-none" style={{ width: `${challenges.length ? (solvedHere / challenges.length) * 100 : 0}%` }} />
          </span>
          <span className="font-mono tabular">
            {solvedHere}/{challenges.length}
          </span>
        </div>
      </div>

      {!desktop && (
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-[3px]" role="tablist" aria-label="Lab sections">
          {mobilePanes.map(([p, label]) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={mobilePane === p}
              onClick={() => setMobilePane(p)}
              className={cn("min-h-9 rounded-md px-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm", mobilePane === p ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {desktop ? (
        <div className="grid h-[calc(100dvh-15rem)] min-h-[560px] grid-cols-[300px_minmax(0,1fr)] gap-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Challenges, saved queries and schema">
            {sidebar}
          </aside>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Query editor">
            <QueryTabs tabs={tabsState.tabs} activeId={active ? null : tabsState.active} challengeTitle={active?.title ?? null} onSelect={selectTab} onSelectChallenge={() => active || undefined} onAdd={newTab} onClose={closeQueryTab} onRename={(id, n) => setTabsState((s) => renameTab(s, id, n))} />
            {toolbar}
            {engineStatus}
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
          {mobilePane === "saved" && <div className="rounded-xl border bg-card p-3">{savedPanel}</div>}
          {mobilePane === "schema" && <div className="rounded-xl border bg-card p-3">{schema}</div>}
          <section className={cn("overflow-hidden rounded-xl border bg-card", mobilePane !== "query" && "hidden")} aria-label="Query editor">
            <QueryTabs tabs={tabsState.tabs} activeId={active ? null : tabsState.active} challengeTitle={active?.title ?? null} onSelect={selectTab} onSelectChallenge={() => active || undefined} onAdd={newTab} onClose={closeQueryTab} onRename={(id, n) => setTabsState((s) => renameTab(s, id, n))} />
            {toolbar}
            {engineStatus}
            {challengeCard}
            {editor}
            {bottom}
          </section>
        </>
      )}
    </div>
  );
}
