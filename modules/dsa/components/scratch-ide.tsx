"use client";

import { useRef, useState } from "react";
import { FileText, FlaskConical, History, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { AskGemini } from "@/modules/ai/components/ask-gemini";
import { IdeShell } from "@/modules/dsa/components/ide/ide-shell";
import { ScratchWorkspace } from "@/modules/dsa/components/ide/scratch-workspace";
import { SolveSheet } from "@/modules/progress/components/solve-sheet";
import { dsaPrompt } from "@/modules/ai/domain/ask-prompt";
import { jsStarterBySlug, jsStarterCode, scratchStarter, stripExamples } from "@/modules/dsa/domain/js-starters";
import type { Language } from "@/modules/dsa/domain/starters";
import type { RunResult } from "@/modules/dsa/lib/playground/runner";
import { testSummary } from "@/modules/dsa/lib/playground/test-summary";
import { CopyAndOpen } from "@/modules/dsa/components/copy-and-open";

const JS_LANGS: readonly Language[] = ["javascript", "typescript"];
const ALL_LANGS: readonly Language[] = ["javascript", "typescript", "python"];

/**
 * A sheet problem without generated test cases: a compiler-style editor and console. JavaScript-track
 * problems start from LeetCode's template with the examples as runnable tests; others start blank.
 */
export function ScratchIde({
  slug,
  title,
  difficulty,
  pattern,
  url,
  statement,
  notes,
  history,
  solveCount,
}: {
  slug: string;
  title: string;
  difficulty?: string;
  pattern?: string;
  url: string;
  statement: React.ReactNode;
  notes: React.ReactNode;
  history: React.ReactNode;
  solveCount: number;
}) {
  const [solveOpen, setSolveOpen] = useState(false);
  const [solveDate, setSolveDate] = useState<string | undefined>(undefined);
  const codeRef = useRef("");
  const lastErrors = useRef<string | undefined>(undefined);
  const js = jsStarterBySlug.get(slug);

  function onRun(res: RunResult) {
    lastErrors.current = res.logs.filter((l) => l.level === "error").map((l) => l.text).join("\n") || undefined;
    const tests = testSummary(res.logs);
    if (tests && tests.failed === 0 && tests.passed > 0 && !res.timedOut) {
      toast.success(`All ${tests.passed} example tests pass`, {
        description: "Submit it on LeetCode for the hidden cases, then log the solve.",
        action: { label: "Log solve", onClick: () => setSolveOpen(true) },
      });
    }
  }

  const description = (
    <div className="space-y-5">
      {statement}
      {js && (
        <aside className="flex gap-2 rounded-xl border bg-info/10 p-3 text-sm" aria-label="How to test">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <p className="text-muted-foreground">
            The editor starts with LeetCode&apos;s template and the examples as <code className="font-mono text-foreground">test(…)</code> blocks. Run checks them in a sandboxed worker; add
            your own with <code className="font-mono text-foreground">assertEqual(actual, expected)</code>.
          </p>
        </aside>
      )}
      <div className="space-y-2 rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">Working here? Submit it on LeetCode too. Your Accepted submission is detected and logged automatically.</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyAndOpen
            slug={slug}
            url={url}
            getCode={() => (js ? stripExamples(codeRef.current) : codeRef.current)}
            onAccepted={(date) => {
              setSolveDate(date);
              setSolveOpen(true);
            }}
          />
          <AskGemini
            subject={js ? "js" : "dsa"}
            label="Ask Gemini about my code"
            className="h-9"
            prompt={() => dsaPrompt({ title, difficulty, pattern, code: codeRef.current, failure: lastErrors.current })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <IdeShell
        storageId="dsa"
        panes={[
          { id: "statement", label: "Problem", icon: FileText, content: description },
          { id: "notes", label: "Notes", icon: NotebookPen, content: notes },
          { id: "history", label: solveCount > 0 ? `History (${solveCount})` : "History", icon: History, content: history },
        ]}
        workspace={
          <ScratchWorkspace
            draftKey={`scratch:${slug}`}
            title={title}
            languages={js ? JS_LANGS : ALL_LANGS}
            starterFor={(lang) => (js ? jsStarterCode(js) : scratchStarter(title, lang))}
            onRun={onRun}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        }
      />
      <SolveSheet target={solveOpen ? { slug, title, date: solveDate } : null} onOpenChange={setSolveOpen} />
    </>
  );
}
