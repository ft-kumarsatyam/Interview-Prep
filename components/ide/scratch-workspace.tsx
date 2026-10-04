"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AArrowDown, AArrowUp, Loader2, Maximize2, Minimize2, Play, RotateCcw } from "lucide-react";
import { CodeEditor } from "@/components/playground/code-editor";
import { ConsoleOutput } from "@/components/playground/console-output";
import { useModKey } from "@/components/playground/use-mod-key";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { stepFontSize } from "@/lib/domain/ide";
import { LANGUAGES, type Language } from "@/lib/domain/starters";
import type { LogLine, RunResult } from "@/lib/playground/runner";
import { runFreeIn } from "@/lib/sandbox/languages";
import { bootPython, pyStatus, subscribePyStatus } from "@/lib/sandbox/py-run";
import { useIde } from "./ide-shell";
import { readPref, useHydrated, writePref } from "./use-client-prefs";

export interface ScratchWorkspaceProps {
  /** Drafts are saved per key and language in localStorage. */
  draftKey: string;
  title: string;
  languages: readonly Language[];
  starterFor: (language: Language) => string;
  onRun?: (result: RunResult) => void;
  onCodeChange?: (code: string) => void;
}

/** A compiler-style pane: editor on top, live console below. Waits for hydration so drafts load on first render. */
export function ScratchWorkspace(props: ScratchWorkspaceProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-full min-h-[420px] animate-pulse rounded-xl border bg-card motion-reduce:animate-none" aria-hidden />;
  return <Workspace {...props} />;
}

function Workspace({ draftKey, title, languages, starterFor, onRun, onCodeChange }: ScratchWorkspaceProps) {
  const { split, full, toggleFull } = useIde();
  const modKey = useModKey();
  const [language, setLanguage] = useState<Language>(() => {
    const saved = readPref(`scratch-lang:${draftKey}`);
    return languages.find((l) => l === saved) ?? languages[0]!;
  });
  const [codeByLang, setCodeByLang] = useState<Partial<Record<Language, string>>>(() =>
    Object.fromEntries(languages.map((l) => [l, readPref(`draft:${draftKey}:${l}`) ?? starterFor(l)])),
  );
  const [fontSize, setFontSize] = useState(() => Number(readPref("ide-font")) || 14);
  const [result, setResult] = useState<RunResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const py = useSyncExternalStore(subscribePyStatus, pyStatus, () => "idle" as const);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const code = codeByLang[language] ?? "";
  const starter = starterFor(language);

  useEffect(() => {
    if (language === "python") void bootPython().catch(() => {});
  }, [language]);

  useEffect(() => {
    onCodeChange?.(code);
    // Report the restored draft once so the parent's copy matches the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCode(next: string) {
    setCodeByLang((cur) => ({ ...cur, [language]: next }));
    onCodeChange?.(next);
    clearTimeout(saveTimer.current);
    const lang = language;
    saveTimer.current = setTimeout(() => writePref(`draft:${draftKey}:${lang}`, next === starterFor(lang) ? null : next), 400);
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    writePref(`scratch-lang:${draftKey}`, next);
    onCodeChange?.(codeByLang[next] ?? "");
    setResult(null);
  }

  function changeFont(dir: 1 | -1) {
    const next = stepFontSize(fontSize, dir);
    setFontSize(next);
    writePref("ide-font", String(next));
  }

  async function run() {
    if (running) return;
    setRunning(true);
    setLiveLogs([]);
    try {
      const res = await runFreeIn(language, code, (line) => setLiveLogs((cur) => [...cur, line]));
      setResult(res);
      onRun?.(res);
    } catch (err) {
      setResult({ logs: [{ level: "error", text: err instanceof Error ? err.message : "Could not run" }], timedOut: false, ms: 0 });
    } finally {
      setRunning(false);
    }
  }

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-muted/30 px-2 py-1.5">
      {languages.length > 1 ? (
        <div role="group" aria-label="Language" className="flex rounded-md bg-muted p-0.5">
          {languages.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={language === l}
              disabled={running}
              onClick={() => changeLanguage(l)}
              className={
                language === l
                  ? "h-7 rounded bg-background px-2.5 text-xs font-medium shadow-sm"
                  : "h-7 rounded px-2.5 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              }
            >
              {LANGUAGES.find((x) => x.id === l)?.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="inline-flex h-8 items-center rounded-md border bg-background px-2 text-xs font-medium">{LANGUAGES.find((x) => x.id === language)?.label}</span>
      )}
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
        disabled={running || code === starter}
        aria-label="Reset to starter code"
        title="Reset to starter code"
        onClick={() => window.confirm("Reset to the starter code? Your current code will be lost.") && setCode(starter)}
      >
        <RotateCcw />
      </Button>
      {split && (
        <Button type="button" variant="ghost" size="icon" className="size-8" onClick={toggleFull} aria-label={full ? "Exit focus mode" : "Focus mode (F)"} title={full ? "Exit focus mode (Esc)" : "Focus mode (F)"}>
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>
      )}
      <span className="ml-auto hidden text-2xs text-muted-foreground lg:inline">Web Worker · no DOM or network · 3 s limit</span>
      <Button type="button" size="sm" className="h-8 px-4 lg:ml-1.5 max-lg:ml-auto" onClick={run} disabled={running} title={`Run (${modKey} + Enter)`}>
        {running ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />} Run
      </Button>
    </div>
  );

  const editor = (
    <CodeEditor
      value={code}
      onChange={setCode}
      onRun={run}
      language={language}
      fontSize={fontSize}
      fill={split}
      minHeight="52dvh"
      ariaLabel={`Code editor for ${title}`}
      className="rounded-none border-0"
    />
  );

  const consolePane = <ConsoleOutput result={result} liveLogs={liveLogs} running={running} modKey={modKey} onClear={() => setResult(null)} fill={split} className={split ? undefined : "border-0"} />;

  if (!split) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border bg-card">
          {toolbar}
          {editor}
        </div>
        <div className="overflow-hidden rounded-xl border">{consolePane}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      {toolbar}
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup storageId="ide:scratch-editor-console" orientation="vertical">
          <ResizablePanel id="editor" defaultSize="60" minSize="25">
            {editor}
          </ResizablePanel>
          <ResizableHandle orientation="vertical" className="border-t" />
          <ResizablePanel id="console" defaultSize="40" minSize="12">
            {consolePane}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
