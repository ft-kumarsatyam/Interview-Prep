"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AArrowDown, AArrowUp, Code2, FolderOpen, Link2, Loader2, PanelLeftClose, PanelLeftOpen, Pencil, Play, Save, Terminal } from "lucide-react";
import { toast } from "sonner";
import { deleteSnippetAction, saveSnippetAction } from "@/app/(app)/playground/actions";
import { DESKTOP_QUERY, readPref, useHydrated, useMediaQuery, writePref } from "@/components/ide/use-client-prefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stepFontSize } from "@/lib/domain/ide";
import { LANGUAGES, isLanguage, type Language } from "@/lib/domain/starters";
import type { Drill } from "@/lib/playground/drills";
import type { LogLine, RunResult } from "@/lib/playground/runner";
import { playgroundHref } from "@/lib/playground/share";
import { runFreeIn } from "@/lib/sandbox/languages";
import type { SnippetSummary } from "@/lib/services/snippets";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./code-editor";
import { ConsoleOutput } from "./console-output";
import { OutputDrills } from "./output-drills";
import { SnippetList } from "./snippet-list";
import { useModKey } from "./use-mod-key";

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
const WIDE_QUERY = "(min-width: 1280px)";
/** `?snippet=` links stop decoding past this length (see app/(app)/playground/page.tsx). */
const SHARE_LIMIT = 8000;

type Pane = "code" | "console";
interface Current {
  id?: string;
  title: string;
  tag: string;
}

function readScratch(): { code: string; language: Language } | null {
  try {
    const v = JSON.parse(readPref(SCRATCH_KEY) ?? "null") as { code?: unknown; language?: unknown } | null;
    return v && typeof v.code === "string" && isLanguage(v.language) ? { code: v.code, language: v.language } : null;
  } catch {
    return null;
  }
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
  const [restored] = useState(() => (initialCode === undefined ? readScratch() : null));
  const [view, setView] = useState<"editor" | "drills">("editor");
  const [pane, setPane] = useState<Pane>("code");
  const [language, setLanguage] = useState<Language>(restored?.language ?? "javascript");
  const [code, setCode] = useState(initialCode ?? restored?.code ?? STARTER);
  const [baseline, setBaseline] = useState(initialCode ?? restored?.code ?? STARTER);
  const [result, setResult] = useState<RunResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<Current>({ title: "", tag: "" });
  const [draft, setDraft] = useState<Current>({ title: "", tag: "" });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(() => readPref("playground:sidebar") !== "hidden");
  const [fontSize, setFontSize] = useState(() => Number(readPref("playground:font")) || 14);
  const [pending, startTransition] = useTransition();
  const scratchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dirty = code !== baseline;
  const errorCount = result?.logs.filter((l) => l.level === "error").length ?? 0;
  const lines = code.split("\n").length;

  // Unsaved scratch work survives a refresh; a saved snippet's edits are kept until you discard them.
  useEffect(() => {
    if (current.id) return;
    clearTimeout(scratchTimer.current);
    scratchTimer.current = setTimeout(() => writePref(SCRATCH_KEY, JSON.stringify({ code, language })), 400);
    return () => clearTimeout(scratchTimer.current);
  }, [code, language, current.id]);

  function confirmDiscard(): boolean {
    return !dirty || window.confirm("Discard your unsaved changes?");
  }

  async function run() {
    if (running) return;
    setRunning(true);
    setLiveLogs([]);
    setPane("console");
    try {
      // TypeScript and Python are only downloaded the first time you run them.
      setResult(await runFreeIn(language, code, (line) => setLiveLogs((cur) => [...cur, line])));
    } catch (err) {
      setResult({ logs: [{ level: "error", text: err instanceof Error ? err.message : "Could not run" }], timedOut: false, ms: 0 });
    } finally {
      setRunning(false);
    }
  }

  function persist(details: Current) {
    startTransition(async () => {
      const title = details.title.trim() || "Untitled";
      const res = await saveSnippetAction({ id: details.id, title, tag: details.tag, code, language });
      if (!res.ok) toast.error(`${res.error}.`);
      else {
        setCurrent({ id: res.id, title, tag: details.tag });
        setBaseline(code);
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

  function openSnippet(s: SnippetSummary) {
    if (s.id !== current.id && !confirmDiscard()) return;
    setCurrent({ id: s.id, title: s.title, tag: s.tag });
    setLanguage(s.language);
    setCode(s.code);
    setBaseline(s.code);
    setResult(null);
    setPane("code");
    setSnippetsOpen(false);
  }

  function newSnippet() {
    if (!confirmDiscard()) return;
    setCurrent({ title: "", tag: "" });
    setCode("");
    setBaseline("");
    setResult(null);
    setPane("code");
    setSnippetsOpen(false);
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteSnippetAction(id);
      if (!res.ok) toast.error(`${res.error}. Refresh and try again.`);
      else {
        toast.success("Snippet deleted");
        if (current.id === id) setCurrent({ title: "", tag: "" });
      }
    });
  }

  function openDrill(d: Drill) {
    if (!confirmDiscard()) return;
    setCurrent({ title: "", tag: "" });
    setLanguage("javascript");
    setCode(d.code);
    setBaseline(d.code);
    setResult(null);
    setPane("code");
    setView("editor");
  }

  function changeLanguage(next: Language) {
    if (next === language) return;
    const starter = next === "python" ? PY_STARTER : STARTER;
    if (code === STARTER || code === PY_STARTER || !code.trim()) {
      setCode(starter);
      setBaseline(starter);
    }
    setLanguage(next);
    setResult(null);
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

  const list = <SnippetList snippets={snippets} currentId={current.id} onOpen={openSnippet} onNew={newSnippet} onDelete={remove} deleting={pending} />;
  const status = current.id ? (dirty ? "Unsaved changes" : "Saved") : "Scratch · autosaved on this device";

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
      <button
        type="button"
        onClick={openDetails}
        className="group flex min-h-8 min-w-0 flex-1 flex-col justify-center rounded-md px-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={share} disabled={!code.trim()} aria-label="Copy a share link" title="Copy a link that opens this code">
        <Link2 />
      </Button>
      <Button variant="outline" size="sm" onClick={save} disabled={pending} className="h-8 shrink-0" aria-label={current.id ? "Update snippet" : "Save snippet"}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        <span className="hidden sm:inline">{current.id ? "Update" : "Save"}</span>
      </Button>
      <Button size="sm" onClick={run} disabled={running} className="hidden h-8 shrink-0 px-4 lg:inline-flex">
        {running ? <Loader2 className="animate-spin" /> : <Play />} {running ? "Running…" : "Run"}
        <span className="ml-1 text-xs opacity-70">{modKey}↵</span>
      </Button>
    </div>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={setCode}
      onRun={run}
      onSave={save}
      language={language}
      fontSize={fontSize}
      fill={desktop}
      minHeight="min(60dvh, 560px)"
      ariaLabel="Playground editor"
      className="rounded-none border-0"
    />
  );

  const consolePane = <ConsoleOutput result={result} liveLogs={liveLogs} running={running} modKey={modKey} onClear={() => setResult(null)} fill={desktop} className={desktop ? undefined : "rounded-none border-0"} />;

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
      </span>
      <span className="hidden xl:inline">Web Worker · no DOM or network · 3 s limit</span>
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
            <div className="min-h-0 flex-1">
              <ResizablePanelGroup key={wide ? "h" : "v"} storageId={wide ? "playground:split-h" : "playground:split-v"} orientation={wide ? "horizontal" : "vertical"}>
                <ResizablePanel id="editor" defaultSize="55" minSize="25">
                  {editor}
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
              <div className={cn(pane !== "code" && "hidden")}>{editor}</div>
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
              <Button onClick={run} disabled={running} className="ml-auto h-10 px-5">
                {running ? <Loader2 className="animate-spin" /> : <Play />} {running ? "Running…" : "Run"}
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
