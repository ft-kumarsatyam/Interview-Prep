"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AArrowDown, AArrowUp, Code2, FolderOpen, History, Link2, Loader2, PanelLeftClose, PanelLeftOpen, Pencil, Play, Save, Sparkles, Terminal } from "lucide-react";
import { toast } from "sonner";
import { deleteSnippetAction, saveSnippetAction } from "@/app/(app)/playground/actions";
import { DESKTOP_QUERY, readPref, useHydrated, useMediaQuery, writePref } from "@/modules/dsa/components/ide/use-client-prefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recordRunAction } from "@/app/(app)/playground/code-lab-actions";
import { RunHistory } from "@/modules/dsa/components/ide/run-history";
import { stepFontSize } from "@/modules/dsa/domain/ide";
import { errorMarkers, type EditorMarker } from "@/modules/dsa/domain/run-errors";
import { moduleHint } from "@/modules/dsa/domain/playground-modules";
import {
  activeTab, canOpen, closeTab, createTab, extFor, focusNth, focusTab, isDirty, migrateLegacyScratch, MAX_TABS, moveTab, openSnippetTab, openTab,
  parseTabs, renameTab, serializeTabs, stepTab, updateTab, uniqueName, type Tab, type TabsState,
} from "@/modules/dsa/domain/playground-tabs";
import { formatCode } from "@/modules/dsa/lib/playground/format";
import { LANGUAGES, type Language } from "@/modules/dsa/domain/starters";
import type { Drill } from "@/modules/dsa/lib/playground/drills";
import type { LogLine, RunResult } from "@/modules/dsa/lib/playground/runner";
import { playgroundHref } from "@/modules/dsa/lib/playground/share";
import { runFreeIn } from "@/core/sandbox/languages";
import type { SnippetSummary } from "@/modules/dsa/services/snippets";
import { cn } from "@/core/utils";
import { useAutosave } from "@/components/shared/use-autosave";
import { CodeEditor } from "@/modules/dsa/components/playground/lazy-code-editor";
import { ConsoleOutput } from "@/modules/dsa/components/playground/console-output";
import { OutputDrills } from "@/modules/dsa/components/playground/output-drills";
import { SnippetList } from "@/modules/dsa/components/playground/snippet-list";
import { StdinBox } from "@/modules/dsa/components/playground/stdin-box";
import { EDITOR_PANEL_ID, TabStrip } from "@/modules/dsa/components/playground/tab-strip";
import { useModKey } from "@/modules/dsa/components/playground/use-mod-key";
import { usePyStatus } from "@/modules/dsa/components/playground/use-py-status";

const STARTER = `// ⌘/Ctrl + Enter to run. No DOM, no network, 3 s limit.
// Helpers: assertEqual(actual, expected, label?), test(name, fn), console.table(...)
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

const PY_STARTER = `# Ctrl/Cmd + Enter to run. Python 3 in your browser (Pyodide); the first run downloads it.
from collections import Counter

words = "the quick brown fox jumps over the lazy dog the end".split()
print(Counter(words).most_common(3))
`;

const SCRATCH_KEY = "playground:scratch";
const TABS_KEY = "playground:tabs";
const WIDE_QUERY = "(min-width: 1280px)";
/** `?snippet=` links stop decoding past this length (see app/(app)/playground/page.tsx). */
const SHARE_LIMIT = 8000;

type Pane = "code" | "console";
interface Current {
  id?: string;
  title: string;
  tag: string;
}
/** What the last run (or format) of a tab produced. Markers only show while the code is unchanged. */
interface Outcome {
  result: RunResult | null;
  code: string;
  markers: EditorMarker[];
}

function defaultState(): TabsState {
  const tab = createTab({ language: "javascript", code: STARTER }, []);
  return { tabs: [tab], activeId: tab.id };
}

/** Saved tabs, else the old single scratch buffer as tab 1, else a starter. A `?snippet=` link opens in its own tab. */
function initialState(initialCode?: string): TabsState {
  let s = parseTabs(readPref(TABS_KEY)) ?? migrateLegacyScratch(readPref(SCRATCH_KEY)) ?? defaultState();
  if (initialCode !== undefined) {
    const same = s.tabs.find((t) => t.code === initialCode);
    if (same) s = focusTab(s, same.id);
    else if (canOpen(s)) s = openTab(s, createTab({ language: "javascript", code: initialCode, name: "shared.js" }, s.tabs));
    else s = updateTab(s, s.activeId, { code: initialCode });
  }
  return s;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">{children}</kbd>;
}

/** Waits for hydration so the scratch draft and layout preferences can be read from localStorage. */
export function Playground(props: { snippets: SnippetSummary[]; initialCode?: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-[calc(100dvh-15rem)] min-h-[520px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-hidden />;
  return <PlaygroundIde {...props} />;
}

function PlaygroundIde({ snippets, initialCode }: { snippets: SnippetSummary[]; initialCode?: string }) {
  const modKey = useModKey();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const wide = useMediaQuery(WIDE_QUERY);
  const [state, setState] = useState<TabsState>(() => initialState(initialCode));
  const [view, setView] = useState<"editor" | "drills">("editor");
  const [pane, setPane] = useState<Pane>("code");
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [liveLogs, setLiveLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [reveal, setReveal] = useState<{ line: number; column?: number; nonce: number } | undefined>();
  const [stdinOpen, setStdinOpen] = useState(() => readPref("playground:stdin") === "open");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [draft, setDraft] = useState<Current>({ title: "", tag: "" });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => readPref("playground:sidebar") !== "hidden");
  const [fontSize, setFontSize] = useState(() => Number(readPref("playground:font")) || 14);
  const [pending, startTransition] = useTransition();

  const stateRef = useRef(state);
  const tab = activeTab(state);
  const { code, language } = tab;
  const current: Current = tab.snippet ?? { title: "", tag: "" };
  const dirty = isDirty(tab);
  const outcome = outcomes[tab.id];
  const result = outcome?.result ?? null;
  const markers = outcome && outcome.code === code ? outcome.markers : undefined;
  const errorCount = result?.logs.filter((l) => l.level === "error").length ?? 0;
  const lines = code.split("\n").length;
  const py = usePyStatus(language === "python");

  const saveStatus = useAutosave(
    state,
    (value) => {
      writePref(TABS_KEY, serializeTabs(value));
      writePref(SCRATCH_KEY, null);
    },
    { delayMs: 400 },
  );

  function patchActive(patch: Partial<Omit<Tab, "id">>) {
    setState((s) => updateTab(s, s.activeId, patch));
  }

  function setOutcome(id: string, o: Outcome | null) {
    setOutcomes((cur) => {
      const next = { ...cur };
      if (o) next[id] = o;
      else delete next[id];
      return next;
    });
  }

  function jump(line: number, column?: number) {
    setReveal((r) => ({ line, column, nonce: (r?.nonce ?? 0) + 1 }));
    setPane("code");
  }

  async function run() {
    if (running) return;
    const target = activeTab(stateRef.current);
    const files = stateRef.current.tabs.filter((t) => t.id !== target.id).map((t) => ({ name: t.name, language: t.language, code: t.code }));
    setRunning(true);
    setLiveLogs([]);
    setOutcome(target.id, null);
    setPane("console");
    let res: RunResult;
    try {
      // TypeScript and Python are only downloaded the first time you run them.
      res = await runFreeIn(target.language, target.code, (line) => setLiveLogs((cur) => [...cur, line]), target.stdin, files);
    } catch (err) {
      res = { logs: [{ level: "error", text: err instanceof Error ? err.message : "Could not run" }], timedOut: false, ms: 0 };
    }
    setOutcome(target.id, { result: res, code: target.code, markers: errorMarkers(target.language, res.logs, target.code) });
    setRunning(false);
    const ok = !res.timedOut && !res.logs.some((l) => l.level === "error");
    void recordRunAction({ kind: "playground", ref: target.snippet?.id ?? "scratch", language: target.language, action: "run", ok, passed: 0, total: 0, ms: res.ms }).then(() =>
      setHistoryVersion((v) => v + 1),
    );
  }

  async function format() {
    if (formatting) return;
    const target = activeTab(stateRef.current);
    setFormatting(true);
    const res = await formatCode(target.language, target.code);
    setFormatting(false);
    if (res.ok) {
      setState((s) => (s.tabs.find((t) => t.id === target.id)?.code === target.code ? updateTab(s, target.id, { code: res.code }) : s));
      setOutcome(target.id, null);
      toast.success(res.code === target.code ? "Already tidy" : res.label === "Tidy" ? "Tidied whitespace" : "Formatted");
      return;
    }
    const { message, line, column } = res.error;
    toast.error(line ? `${message} (line ${line})` : message);
    if (line) {
      setOutcome(target.id, { result: outcomes[target.id]?.result ?? null, code: target.code, markers: [{ line, column, message }] });
      jump(line, column);
    }
  }

  function persist(details: Current) {
    const target = tab;
    startTransition(async () => {
      const title = details.title.trim() || "Untitled";
      const res = await saveSnippetAction({ id: details.id, title, tag: details.tag, code: target.code, language: target.language });
      if (!res.ok) toast.error(`${res.error}.`);
      else {
        setState((s) => updateTab(s, target.id, { snippet: { id: res.id, title, tag: details.tag }, baseline: target.code }));
        setDetailsOpen(false);
        toast.success(details.id ? "Snippet updated" : "Snippet saved");
      }
    });
  }

  function save() {
    if (pending) return;
    if (current.id) persist(current);
    else openDetails();
  }

  function openDetails() {
    setDraft(current);
    setDetailsOpen(true);
  }

  function addTab(input: { language: Language; code: string; name?: string }): boolean {
    if (!canOpen(stateRef.current)) {
      toast.error(`Up to ${MAX_TABS} tabs. Close one first.`);
      return false;
    }
    setState((s) => openTab(s, createTab(input, s.tabs)));
    setPane("code");
    return true;
  }

  function openSnippet(s: SnippetSummary) {
    const next = openSnippetTab(stateRef.current, s);
    if (!next) return void toast.error(`Up to ${MAX_TABS} tabs. Close one first.`);
    setState(next);
    setPane("code");
    setSnippetsOpen(false);
  }

  function newSnippet() {
    if (addTab({ language, code: "" })) setSnippetsOpen(false);
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteSnippetAction(id);
      if (!res.ok) toast.error(`${res.error}. Refresh and try again.`);
      else {
        toast.success("Snippet deleted");
        setState((s) => ({ ...s, tabs: s.tabs.map((t) => (t.snippet?.id === id ? { ...t, snippet: undefined } : t)) }));
      }
    });
  }

  function openDrill(d: Drill) {
    if (addTab({ language: "javascript", code: d.code, name: "drill.js" })) setView("editor");
  }

  function closeOne(id: string) {
    const t = stateRef.current.tabs.find((x) => x.id === id);
    if (!t) return;
    if (isDirty(t) && t.code.trim() && !window.confirm(`Close ${t.name}? Its unsaved changes will be lost.`)) return;
    setState((s) => closeTab(s, id, () => createTab({ language: t.language, code: "" }, [])));
    setOutcome(id, null);
  }

  function changeLanguage(next: Language) {
    if (next === language) return;
    const starter = next === "python" ? PY_STARTER : STARTER;
    const isStarter = code === STARTER || code === PY_STARTER || !code.trim();
    setState((s) => {
      const t = activeTab(s);
      const others = s.tabs.filter((x) => x.id !== t.id).map((x) => x.name);
      const oldExt = `.${extFor(t.language)}`;
      const name = t.name.toLowerCase().endsWith(oldExt) ? uniqueName(`${t.name.slice(0, -oldExt.length)}.${extFor(next)}`, others) : t.name;
      return updateTab(s, t.id, { language: next, name, ...(isStarter && !t.snippet ? { code: starter, baseline: starter } : {}) });
    });
    setOutcome(tab.id, null);
  }

  function changeFont(dir: 1 | -1) {
    const next = stepFontSize(fontSize, dir);
    setFontSize(next);
    writePref("playground:font", String(next));
  }

  function toggleSidebar() {
    setShowSidebar((v) => {
      writePref("playground:sidebar", v ? "hidden" : null);
      return !v;
    });
  }

  function toggleStdin() {
    setStdinOpen((v) => {
      writePref("playground:stdin", v ? null : "open");
      return !v;
    });
  }

  async function share() {
    const href = playgroundHref(code);
    if (href.length - "/playground?snippet=".length > SHARE_LIMIT) return void toast.error("Too long to share as a link. Save it as a snippet instead.");
    try {
      await navigator.clipboard.writeText(`${location.origin}${href}`);
      toast.success("Link copied", { description: "Opening it loads this code into the Playground." });
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  // Shortcuts that must work from inside the editor: switch tabs (Ctrl/Cmd+Alt+Arrow, Alt+1..8) and format (Shift+Alt+F).
  const actions = useRef({ format });
  useEffect(() => {
    stateRef.current = state;
    actions.current = { format };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
        e.preventDefault();
        setState((s) => stepTab(s, e.code === "ArrowRight" ? 1 : -1));
      } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey && /^Digit[1-8]$/.test(e.code)) {
        e.preventDefault();
        setState((s) => focusNth(s, Number(e.code.slice(5))));
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyF") {
        e.preventDefault();
        void actions.current.format();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const list = <SnippetList snippets={snippets} currentId={current.id} onOpen={openSnippet} onNew={newSnippet} onDelete={remove} deleting={pending} />;
  const status = current.id
    ? dirty ? "Unsaved changes" : "Saved"
    : `Scratch · ${saveStatus === "saving" ? "saving…" : saveStatus === "error" ? "save failed" : "autosaved on this device"}`;
  const runLabel = running ? "Running…" : "Run";
  const pyNote = py.loading ? (
    <span role="status" className="max-w-40 truncate text-2xs text-muted-foreground">
      {py.stage}…
    </span>
  ) : null;

  const languagePills = (
    <div role="group" aria-label="Language" className="flex shrink-0 rounded-md bg-muted p-0.5" title="TypeScript: types are stripped and syntax errors reported (no type checking). Python: Pyodide, downloaded on first run.">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={language === l.id}
          disabled={running}
          onClick={() => changeLanguage(l.id)}
          className={cn(
            "h-7 rounded px-2 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            language === l.id ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  );

  const toolbar = (
    <div className="flex shrink-0 items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
      <Button size="icon" variant="ghost" className="size-8 shrink-0 lg:hidden" onClick={() => setSnippetsOpen(true)} aria-label={`Open snippets (${snippets.length})`}>
        <FolderOpen />
      </Button>
      <Button size="icon" variant="ghost" className="hidden size-8 shrink-0 lg:inline-flex" onClick={toggleSidebar} aria-label={showSidebar ? "Hide snippets" : "Show snippets"} title={showSidebar ? "Hide snippets" : "Show snippets"}>
        {showSidebar ? <PanelLeftClose /> : <PanelLeftOpen />}
      </Button>
      <span className="min-w-0 flex-1 sm:hidden" aria-hidden />
      <button
        type="button"
        onClick={openDetails}
        className="group hidden min-h-8 min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-md px-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex"
        aria-label="Edit snippet title and tags"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className={cn("size-1.5 shrink-0 rounded-full", dirty && current.id ? "bg-warning" : current.id ? "bg-success" : "bg-muted-foreground/40")} aria-hidden />
          <span className="truncate">{current.title || "Untitled snippet"}</span>
          <Pencil className="size-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden />
        </span>
      </button>
      {languagePills}
      <div className="hidden items-center sm:flex">
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
        className="size-8 shrink-0"
        onClick={() => void format()}
        disabled={formatting || !code.trim()}
        aria-label={language === "python" ? "Tidy whitespace" : "Format code"}
        title={language === "python" ? "Tidy: tabs to spaces, trailing space, final newline (Shift+Alt+F)" : "Format with Prettier (Shift+Alt+F)"}
      >
        {formatting ? <Loader2 className="animate-spin" /> : <Sparkles />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setHistoryOpen(true)} aria-label="Recent runs" title="Recent runs">
        <History />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={share} disabled={!code.trim()} aria-label="Copy a share link" title="Copy a link that opens this code">
        <Link2 />
      </Button>
      <Button variant="outline" size="sm" onClick={save} disabled={pending} className="h-8 shrink-0" aria-label={current.id ? "Update snippet" : "Save snippet"}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        <span className="hidden sm:inline">{current.id ? "Update" : "Save"}</span>
      </Button>
      <span className="hidden lg:inline-flex">{pyNote}</span>
      <Button size="sm" onClick={run} disabled={running} className="hidden h-8 shrink-0 px-4 lg:inline-flex">
        {running ? <Loader2 className="animate-spin" /> : <Play />} {runLabel}
        <span className="ml-1 text-xs opacity-70">{modKey}↵</span>
      </Button>
    </div>
  );

  const tabStrip = (
    <>
      <TabStrip
        tabs={state.tabs}
        activeId={state.activeId}
        onFocus={(id) => setState((s) => focusTab(s, id))}
        onClose={closeOne}
        onRename={(id, name) => setState((s) => renameTab(s, id, name))}
        onMove={(id, to) => setState((s) => moveTab(s, id, to))}
        onNew={() => addTab({ language, code: "" })}
      />
      {state.tabs.length > 1 && <p className="shrink-0 truncate border-b bg-muted/10 px-3 py-1 text-2xs text-muted-foreground">{moduleHint(language)}</p>}
    </>
  );

  const editor = (
    <div id={EDITOR_PANEL_ID} role="tabpanel" aria-labelledby={`playground-tab-${tab.id}`} className={cn("min-h-0", desktop && "flex-1")}>
      <CodeEditor
        value={code}
        onChange={(v) => patchActive({ code: v })}
        onRun={run}
        onSave={save}
        language={language}
        fontSize={fontSize}
        fill={desktop}
        minHeight="min(60dvh, 560px)"
        ariaLabel="Playground editor"
        markers={markers}
        reveal={reveal}
        className="rounded-none border-0"
      />
    </div>
  );

  const stdinBox = <StdinBox value={tab.stdin} onChange={(v) => patchActive({ stdin: v })} open={stdinOpen} onToggle={toggleStdin} language={language} onRun={run} />;

  const consolePane = (
    <ConsoleOutput
      result={result}
      liveLogs={liveLogs}
      running={running}
      modKey={modKey}
      onClear={() => setOutcome(tab.id, null)}
      fill={desktop}
      language={language}
      source={code}
      onJump={jump}
      className={desktop ? undefined : "rounded-none border-0"}
    />
  );

  const statusBar = (
    <div className="hidden shrink-0 items-center gap-3 border-t bg-muted/30 px-3 py-1 text-2xs text-muted-foreground sm:flex">
      <span>{status}</span>
      <span className="font-mono tabular">
        {lines} {lines === 1 ? "line" : "lines"} · {code.length} chars
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>{modKey}</Kbd>
        <Kbd>Enter</Kbd> run
        <span aria-hidden>·</span>
        <Kbd>{modKey}</Kbd>
        <Kbd>S</Kbd> save
        <span aria-hidden className="hidden xl:inline">·</span>
        <span className="hidden items-center gap-1.5 xl:inline-flex">
          <Kbd>⇧⌥F</Kbd> format
        </span>
      </span>
      <span className="hidden 2xl:inline">Web Worker · no DOM or network · 3 s limit</span>
    </div>
  );

  return (
    <Tabs data-ide value={view} onValueChange={(v) => setView(v === "drills" ? "drills" : "editor")}>
      <TabsList className="h-10! w-full sm:w-fit">
        <TabsTrigger value="editor" className="px-4">
          <Code2 /> Editor
        </TabsTrigger>
        <TabsTrigger value="drills" className="px-4">
          <Terminal /> Output drills
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor" forceMount className={cn("mt-3 data-[state=inactive]:hidden", desktop && showSidebar && "grid grid-cols-[248px_minmax(0,1fr)] gap-3")}>
        {desktop && showSidebar && (
          <aside className="h-[calc(100dvh-15rem)] min-h-[520px] overflow-y-auto overscroll-contain rounded-xl border bg-card p-3" aria-label="Snippets">
            {list}
          </aside>
        )}

        {desktop ? (
          <section className="flex h-[calc(100dvh-15rem)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border bg-card" aria-label="Editor and console">
            {toolbar}
            {tabStrip}
            <div className="min-h-0 flex-1">
              <ResizablePanelGroup key={wide ? "h" : "v"} storageId={wide ? "playground:split-h" : "playground:split-v"} orientation={wide ? "horizontal" : "vertical"}>
                <ResizablePanel id="editor" defaultSize="55" minSize="25">
                  <div className="flex h-full min-h-0 flex-col">
                    {editor}
                    {stdinBox}
                  </div>
                </ResizablePanel>
                <ResizableHandle orientation={wide ? "horizontal" : "vertical"} className={wide ? "border-l" : "border-t"} />
                <ResizablePanel id="console" defaultSize="45" minSize="15">
                  {consolePane}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
            {statusBar}
          </section>
        ) : (
          <div className="space-y-3">
            <section className="overflow-hidden rounded-xl border bg-card" aria-label="Editor">
              {toolbar}
              {tabStrip}
              <div className={cn(pane !== "code" && "hidden")}>
                {editor}
                {stdinBox}
              </div>
              <div className={cn(pane !== "console" && "hidden")}>{consolePane}</div>
              {statusBar}
            </section>

            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center gap-2 border-t bg-background/95 px-4 py-2 backdrop-blur">
              <div role="group" aria-label="Playground view" className="flex rounded-lg bg-muted p-[3px]">
                {(
                  [
                    { id: "code", label: "Code", icon: Code2 },
                    { id: "console", label: "Console", icon: Terminal },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={pane === p.id}
                    onClick={() => setPane(p.id)}
                    className={cn(
                      "relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      pane === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    <p.icon className="size-4" aria-hidden />
                    {p.label}
                    {p.id === "console" && errorCount > 0 && pane !== "console" && (
                      <span className="rounded-full bg-destructive/15 px-1.5 text-2xs leading-4 font-semibold text-destructive tabular">
                        {errorCount}
                        <span className="sr-only"> errors</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <span className="ml-auto min-w-0">{pyNote}</span>
              <Button onClick={run} disabled={running} className="h-10 shrink-0 px-5">
                {running ? <Loader2 className="animate-spin" /> : <Play />} {runLabel}
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="drills" forceMount className="mt-4 data-[state=inactive]:hidden">
        <OutputDrills onOpenInEditor={openDrill} modKey={modKey} />
      </TabsContent>

      <Sheet open={snippetsOpen} onOpenChange={setSnippetsOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Snippets</SheetTitle>
            <SheetDescription>Open, search or delete your saved code.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{list}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recent runs</DialogTitle>
            <DialogDescription>{tab.snippet ? `Runs of ${tab.snippet.title}.` : "Runs of scratch work."} Only the time and result are kept, never your code.</DialogDescription>
          </DialogHeader>
          <RunHistory kind="playground" refKey={tab.snippet?.id ?? "scratch"} version={historyVersion} />
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              persist({ ...draft, id: current.id });
            }}
          >
            <DialogHeader>
              <DialogTitle>{current.id ? "Snippet details" : "Save snippet"}</DialogTitle>
              <DialogDescription>Tags are comma separated, e.g. js-async, closures. Link a snippet from your topic notes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="snippet-title">Title</Label>
              <Input id="snippet-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Debounce vs throttle" autoFocus maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="snippet-tags">Tags</Label>
              <Input id="snippet-tags" value={draft.tag} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))} placeholder="js-async, closures" maxLength={120} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !code.trim()}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />} {current.id ? "Save changes" : "Save snippet"}
              </Button>
            </DialogFooter>
            {!code.trim() && <p className="text-xs text-destructive">Write some code first; empty snippets can&apos;t be saved.</p>}
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
