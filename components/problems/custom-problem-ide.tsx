"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookCheck, Eye, FileText, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomProblemAction, recordCustomResultAction } from "@/app/(app)/problems/actions";
import { HintReveal } from "@/components/dsa/hint-reveal";
import { CodeWorkspace, type SubmitOutcome } from "@/components/ide/code-workspace";
import { IdeShell } from "@/components/ide/ide-shell";
import { ArticleMarkdown } from "@/components/news/article-markdown";
import { Button } from "@/components/ui/button";
import { toRunnable } from "@/lib/domain/custom-problem";
import { LANGUAGES } from "@/lib/domain/starters";
import type { CustomProblemDetail } from "@/lib/services/custom-problems";

export function CustomProblemIde({ problem }: { problem: CustomProblemDetail }) {
  const router = useRouter();
  const [showSolution, setShowSolution] = useState(false);
  const [pending, startTransition] = useTransition();
  const entry = toRunnable(problem);

  function onSubmit(out: SubmitOutcome) {
    if (out.crashed) return void toast.error(out.crashed.split("\n")[0]);
    const accepted = out.summary.allPassed && !out.timedOut;
    if (accepted) toast.success(`Accepted · all ${out.summary.total} cases passed`);
    else toast.error(`${out.summary.passed}/${out.summary.total} cases passed`);
    startTransition(async () => {
      const res = await recordCustomResultAction({ slug: problem.slug, accepted, language: out.language, ms: Math.min(out.ms, 600_000) });
      if (res.ok && accepted) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`Delete “${problem.title}” and its history?`)) return;
    startTransition(async () => {
      const res = await deleteCustomProblemAction(problem.slug);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Problem deleted");
      router.push("/problems");
    });
  }

  const description = (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{problem.topic}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{problem.source === "ai" ? "AI-generated" : "Pasted"}</span>
      </div>
      <ArticleMarkdown markdown={problem.statementMd} />
      <HintReveal hints={entry.hints} />
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={remove} disabled={pending}>
        <Trash2 /> Delete problem
      </Button>
    </div>
  );

  const solution = problem.solution ? (
    showSolution ? (
      <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs whitespace-pre">{problem.solution}</pre>
    ) : (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>A reference solution in JavaScript. Try the problem first: reading it early makes the practice worth much less.</p>
        <Button type="button" variant="outline" onClick={() => setShowSolution(true)}>
          <Eye /> Show the solution
        </Button>
      </div>
    )
  ) : (
    <p className="text-sm text-muted-foreground">This problem has no reference solution.</p>
  );

  const history = problem.solves.length ? (
    <ol className="space-y-2 text-sm">
      {problem.solves.map((s, i) => (
        <li key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
          <span>{s.date}</span>
          <span className="text-xs text-muted-foreground">
            {LANGUAGES.find((l) => l.id === s.language)?.label} · {s.ms} ms
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-sm text-muted-foreground">
      No accepted submissions yet{problem.attempts ? ` (${problem.attempts} attempt${problem.attempts === 1 ? "" : "s"})` : ""}. Custom problems don&apos;t count toward your daily DSA target.
    </p>
  );

  return (
    <IdeShell
      storageId="custom"
      panes={[
        { id: "statement", label: "Problem", icon: FileText, content: description },
        { id: "solution", label: "Solution", icon: BookCheck, content: solution },
        { id: "history", label: problem.solves.length ? `Solves (${problem.solves.length})` : "Solves", icon: History, content: history },
      ]}
      workspace={<CodeWorkspace draftKey={`custom:${problem.slug}`} title={problem.title} entry={entry} cases={entry.cases} onSubmit={onSubmit} />}
    />
  );
}
