"use client";

import { useState, useTransition } from "react";
import { Code2, FolderOpen, Loader2, Pencil, Play, Save, Terminal } from "lucide-react";
import { toast } from "sonner";
import { deleteSnippetAction, saveSnippetAction } from "@/app/(app)/playground/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGES, isLanguage, type Language } from "@/lib/domain/starters";
import type { Drill } from "@/lib/playground/drills";
import type { LogLine, RunResult } from "@/lib/playground/runner";
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

type Pane = "code" | "console";
interface Current {
  id?: string;
  title: string;
  tag: string;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">{children}</kbd>;
}

export function Playground({ snippets, initialCode }: { snippets: SnippetSummary[]; initialCode?: string }) {
  const modKey = useModKey();
  const [view, setView] = useState<"editor" | "drills">("editor");
  const [pane, setPane] = useState<Pane>("code");
  const [code, setCode] = useState(initialCode ?? STARTER);
  const [baseline, setBaseline] = useState(initialCode ?? STARTER);
  const [result, setResult] = useState<RunResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<Current>({ title: "", tag: "" });
  const [draft, setDraft] = useState<Current>({ title: "", tag: "" });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [language, setLanguage] = useState<Language>("javascript");

  const dirty = code !== baseline;
  const errorCount = result?.logs.filter((l) => l.level === "error").length ?? 0;

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
    setCode(d.code);
    setBaseline(d.code);
    setResult(null);
    setPane("code");
    setView("editor");
  }

  const list = (
    <SnippetList snippets={snippets} currentId={current.id} onOpen={openSnippet} onNew={newSnippet} onDelete={remove} deleting={pending} />
  );

  const status = current.id ? (dirty ? "Unsaved changes" : "Saved") : dirty ? "Scratch · not saved" : "Scratch";

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

      <TabsContent value="editor" forceMount className="mt-4 grid gap-4 data-[state=inactive]:hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Snippets">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border bg-card p-3">{list}</div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border bg-card p-2 pl-3">
            <Button size="icon" variant="outline" className="size-9 shrink-0 lg:hidden" onClick={() => setSnippetsOpen(true)} aria-label={`Open snippets (${snippets.length})`}>
              <FolderOpen />
            </Button>
            <button
              type="button"
              onClick={openDetails}
              className="group flex min-h-9 min-w-0 flex-1 flex-col justify-center rounded-md px-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Edit snippet title and tags"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <span className="truncate">{current.title || "Untitled snippet"}</span>
                <Pencil className="size-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden />
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", dirty ? "bg-warning" : current.id ? "bg-success" : "bg-muted-foreground/40")} aria-hidden />
                {status}
              </span>
            </button>
            <select
              value={language}
              aria-label="Language"
              title="TypeScript: types are stripped and syntax errors reported (no type checking). Python: Pyodide, downloaded on first run."
              onChange={(e) => {
                const next = e.target.value;
                if (!isLanguage(next)) return;
                const starter = next === "python" ? PY_STARTER : STARTER;
                if (code === STARTER || code === PY_STARTER || !code.trim()) {
                  setCode(starter);
                  setBaseline(starter);
                }
                setLanguage(next);
              }}
              className="h-9 shrink-0 rounded-md border bg-background px-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.short}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={save} disabled={pending} className="h-9 shrink-0" aria-label={current.id ? "Update snippet" : "Save snippet"}>
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
              <span className="hidden sm:inline">{current.id ? "Update" : "Save"}</span>
            </Button>
            <Button onClick={run} disabled={running} className="hidden h-9 shrink-0 px-4 lg:inline-flex">
              {running ? <Loader2 className="animate-spin" /> : <Play />} {running ? "Running…" : "Run"}
              <span className="ml-1 text-xs opacity-70">{modKey}↵</span>
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className={cn("min-w-0 space-y-1.5", pane !== "code" && "hidden lg:block")}>
              <CodeEditor value={code} onChange={setCode} onRun={run} onSave={save} language={language} minHeight="min(60dvh, 640px)" />
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <Kbd>{modKey}</Kbd>
                <Kbd>Enter</Kbd> run
                <span className="mx-1" aria-hidden>
                  ·
                </span>
                <Kbd>{modKey}</Kbd>
                <Kbd>S</Kbd> save
                <span className="ml-auto">Web Worker · no DOM or network · 3 s limit</span>
              </p>
            </div>
            <ConsoleOutput
              result={result}
              liveLogs={liveLogs}
              running={running}
              modKey={modKey}
              onClear={() => setResult(null)}
              className={cn(pane !== "console" && "hidden lg:flex")}
            />
          </div>

          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center gap-2 border-t bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
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
