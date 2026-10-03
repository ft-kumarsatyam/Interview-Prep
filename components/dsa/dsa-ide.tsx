"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, History, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { markAttemptedAction, revealCaseAction } from "@/app/(app)/dsa/[slug]/actions";
import { AskGemini } from "@/components/ai/ask-gemini";
import { CodeWorkspace, type SubmitOutcome } from "@/components/ide/code-workspace";
import { IdeShell } from "@/components/ide/ide-shell";
import { SolveSheet } from "@/components/progress/solve-sheet";
import type { ProblemTestcaseEntry } from "@/lib/content";
import { dsaPrompt } from "@/lib/domain/ask-prompt";
import { describeFailure, effectiveCases, pickRevealCase, type CaseOutcome } from "@/lib/domain/dsa-runner";
import { CopyAndOpen } from "./copy-and-open";
import { HintReveal } from "./hint-reveal";

/**
 * A sheet problem in the full-screen workspace: statement, notes and history on the left; editor, test
 * cases and console on the right. Runs JavaScript, TypeScript or Python entirely in your browser.
 */
export function DsaIde({
  slug,
  title,
  entry,
  difficulty,
  pattern,
  url,
  revealedCases = [],
  statement,
  notes,
  history,
  solveCount,
}: {
  slug: string;
  title: string;
  entry: ProblemTestcaseEntry;
  difficulty?: string;
  pattern?: string;
  url: string;
  revealedCases?: number[];
  statement: React.ReactNode;
  notes: React.ReactNode;
  history: React.ReactNode;
  solveCount: number;
}) {
  const [revealed, setRevealed] = useState<number[]>(revealedCases);
  const [solveOpen, setSolveOpen] = useState(false);
  const [solveDate, setSolveDate] = useState<string | undefined>(undefined);
  const [, startTransition] = useTransition();
  const codeRef = useRef(entry.starter);
  const lastResults = useRef<CaseOutcome[] | null>(null);
  const cases = effectiveCases(entry.cases, revealed);

  function onSubmit(out: SubmitOutcome) {
    lastResults.current = out.results;
    if (out.crashed) {
      toast.error(out.crashed.split("\n")[0]);
      return;
    }
    if (out.summary.allPassed && !out.timedOut) {
      toast.success(`Accepted · all ${out.summary.total} cases passed`);
      setSolveOpen(true);
      return;
    }
    const reveal = pickRevealCase(cases, out.results, revealed);
    toast.error(`${out.summary.passed}/${out.summary.total} cases passed${reveal === undefined ? "" : ". One hidden case is now shown so you can debug it."}`);
    startTransition(() => {
      void markAttemptedAction(slug);
      if (reveal !== undefined) {
        void revealCaseAction({ slug, index: reveal }).then((r) => {
          if (r.ok) setRevealed((prev) => (prev.includes(reveal) ? prev : [...prev, reveal]));
        });
      }
    });
  }

  const description = (
    <div className="space-y-5">
      {statement}
      <HintReveal hints={entry.hints} />
      <div className="space-y-2 rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">Passing here? Submit it on LeetCode too. Your Accepted submission is detected and logged automatically.</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyAndOpen
            slug={slug}
            url={url}
            getCode={() => codeRef.current}
            onAccepted={(date) => {
              setSolveDate(date);
              setSolveOpen(true);
            }}
          />
          <AskGemini
            subject={pattern && /^SQL/.test(pattern) ? "dbms" : pattern === "JavaScript 30-Days" ? "js" : "dsa"}
            label="Ask Gemini about my code"
            className="h-9"
            prompt={() =>
              dsaPrompt({ title, difficulty, pattern, code: codeRef.current, failure: lastResults.current ? describeFailure(cases, lastResults.current) : undefined })
            }
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
          <CodeWorkspace
            draftKey={`dsa:${slug}`}
            title={title}
            entry={entry}
            cases={cases}
            onSubmit={onSubmit}
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
