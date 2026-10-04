"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, History, Info, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { markAttemptedAction } from "@/app/(app)/dsa/[slug]/actions";
import { AskGemini } from "@/components/ai/ask-gemini";
import { SqlWorkspace, type SqlSubmitOutcome } from "@/components/db-lab/sql-workspace";
import { IdeShell } from "@/components/ide/ide-shell";
import { SolveSheet } from "@/components/progress/solve-sheet";
import { dsaPrompt } from "@/lib/domain/ask-prompt";
import { SQL_DIALECT_TIPS, type SqlProblem } from "@/lib/domain/sql-problems";
import { CopyAndOpen } from "./copy-and-open";

/** A SQL-track sheet problem with an in-browser database: write the query, run it, submit it against the reference. */
export function SqlIde({
  problem,
  title,
  difficulty,
  pattern,
  url,
  statement,
  notes,
  history,
  solveCount,
}: {
  problem: SqlProblem;
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
  const [, startTransition] = useTransition();
  const codeRef = useRef("");
  const lastVerdict = useRef<string | undefined>(undefined);

  function onSubmit({ verdict }: SqlSubmitOutcome) {
    lastVerdict.current = verdict.ok ? undefined : verdict.text;
    if (verdict.ok) {
      toast.success("Accepted · your rows match the expected output");
      setSolveDate(undefined);
      setSolveOpen(true);
      return;
    }
    toast.error(`Wrong answer · ${verdict.text}`);
    startTransition(() => void markAttemptedAction(problem.slug));
  }

  const description = (
    <div className="space-y-5">
      {statement}
      <aside className="space-y-2 rounded-xl border bg-info/10 p-3 text-sm" aria-label="How this runs">
        <p className="flex items-center gap-1.5 font-medium text-info">
          <Info className="size-4" aria-hidden /> Runs in your browser
        </p>
        {problem.note && <p className="text-foreground">{problem.note}</p>}
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {SQL_DIALECT_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </aside>
      <div className="space-y-2 rounded-xl border border-dashed p-3">
        <p className="text-xs text-muted-foreground">Accepted here? Submit it on LeetCode too (MySQL). Your Accepted submission is detected and logged automatically.</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyAndOpen
            slug={problem.slug}
            url={url}
            getCode={() => codeRef.current}
            onAccepted={(date) => {
              setSolveDate(date);
              setSolveOpen(true);
            }}
          />
          <AskGemini
            subject="dbms"
            label="Ask Gemini about my query"
            className="h-9"
            prompt={() => dsaPrompt({ title, difficulty, pattern, code: codeRef.current, failure: lastVerdict.current })}
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
          <SqlWorkspace
            problem={problem}
            title={title}
            onSubmit={onSubmit}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        }
      />
      <SolveSheet target={solveOpen ? { slug: problem.slug, title, date: solveDate } : null} onOpenChange={setSolveOpen} />
    </>
  );
}
