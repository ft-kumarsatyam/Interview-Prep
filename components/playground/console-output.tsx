"use client";

import { AlertTriangle, Bug, Check, ChevronRight, CircleCheck, Copy, Eraser, FlaskConical, Info, Loader2, Terminal, Timer, XCircle, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { LogLine, RunResult } from "@/lib/playground/runner";
import { testSummary } from "@/lib/playground/test-summary";
import { cn } from "@/lib/utils";

const LEVEL: Record<LogLine["level"], { icon: LucideIcon; text: string; row: string; label: string }> = {
  log: { icon: ChevronRight, text: "text-foreground", row: "", label: "log" },
  info: { icon: Info, text: "text-chart-5", row: "", label: "info" },
  debug: { icon: Bug, text: "text-muted-foreground", row: "", label: "debug" },
  warn: { icon: AlertTriangle, text: "text-warning", row: "bg-warning/8", label: "warning" },
  error: { icon: XCircle, text: "text-destructive", row: "bg-destructive/8", label: "error" },
};

export function ConsoleOutput({
  result,
  liveLogs,
  running,
  onClear,
  modKey,
  fill = false,
  className,
}: {
  result: RunResult | null;
  liveLogs: LogLine[];
  running: boolean;
  onClear: () => void;
  modKey: string;
  /** Fill the parent's height (inside a resizable IDE pane) instead of sizing to the content. */
  fill?: boolean;
  className?: string;
}) {
  const logs = running ? liveLogs : (result?.logs ?? []);
  const errors = logs.filter((l) => l.level === "error").length;
  const warnings = logs.filter((l) => l.level === "warn").length;
  const tests = running ? null : testSummary(logs);

  async function copy() {
    try {
      await navigator.clipboard.writeText(logs.map((l) => l.text).join("\n"));
      toast.success("Output copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  return (
    <section aria-label="Console" className={cn("flex flex-col overflow-hidden bg-muted/30", fill ? "h-full" : "min-h-80 rounded-lg border", className)}>
      <div className="flex min-h-10 shrink-0 items-center gap-2 border-b px-3 text-xs">
        <Terminal className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">Console</span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground" aria-live="polite">
          {running ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Running…
            </span>
          ) : result?.timedOut ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <Timer className="size-3.5" aria-hidden /> Killed after 3 s
            </span>
          ) : result ? (
            <>
              {tests ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", tests.failed ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                  <FlaskConical className="size-3.5" aria-hidden /> {tests.passed}/{tests.passed + tests.failed} tests passed
                </span>
              ) : errors > 0 ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <XCircle className="size-3.5" aria-hidden /> {errors} {errors === 1 ? "error" : "errors"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-success">
                  <CircleCheck className="size-3.5" aria-hidden /> Done
                </span>
              )}
              {warnings > 0 && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <AlertTriangle className="size-3.5" aria-hidden /> {warnings}
                </span>
              )}
              <span className="font-mono tabular">{result.ms} ms</span>
            </>
          ) : null}
        </span>
        <Button size="icon-sm" variant="ghost" className="size-8" onClick={copy} disabled={running || logs.length === 0} aria-label="Copy output" title="Copy output">
          <Copy />
        </Button>
        <Button size="icon-sm" variant="ghost" className="size-8" onClick={onClear} disabled={running || !result} aria-label="Clear console" title="Clear console">
          <Eraser />
        </Button>
      </div>

      <div className={cn("flex-1 overflow-auto overscroll-contain py-1 font-mono text-[13px] leading-relaxed", !fill && "max-h-[60vh] lg:max-h-[520px]")} role="log">
        {!running && !result && (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center font-sans text-sm text-muted-foreground">
            <Terminal className="size-6" aria-hidden />
            <p>Run your code to see its output here.</p>
            <p className="hidden text-xs sm:block">
              Press <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-2xs">{modKey}</kbd>{" "}
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-2xs">Enter</kbd> in the editor.
            </p>
          </div>
        )}
        {logs.map((l, i) => {
          const meta = LEVEL[l.level];
          const Icon = meta.icon;
          return (
            <div key={i} className={cn("flex gap-2 border-b border-border/40 px-3 py-1 last:border-b-0", meta.row)}>
              <Icon className={cn("mt-[3px] size-3.5 shrink-0", meta.text, l.level === "log" && "text-muted-foreground")} aria-label={meta.label} />
              <span className={cn("min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]", meta.text)}>{l.text}</span>
            </div>
          );
        })}
        {result && !running && result.logs.length === 0 && !result.timedOut && (
          <p className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <Check className="size-3.5" aria-hidden /> Ran without printing anything.
          </p>
        )}
        {result?.timedOut && !running && (
          <div className="mx-3 my-2 flex gap-2 rounded-md bg-warning/10 p-2.5 font-sans text-sm text-warning">
            <Timer className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Stopped: still running after 3 s. Look for an infinite loop, an interval that never clears, or a promise that never settles.</span>
          </div>
        )}
      </div>
    </section>
  );
}
