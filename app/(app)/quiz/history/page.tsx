import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listQuizHistory } from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz history" };

export default async function QuizHistoryPage() {
  const rows = await listQuizHistory();
  return (
    <>
      <Link href="/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Quiz
      </Link>
      <PageHeader title="Quiz history" description="Every daily and weekly quiz, with your best score. Open one to review and practise what you missed." />
      {rows.length === 0 ? (
        <EmptyState icon={History} title="No quizzes yet">
          Your first quiz appears here once you start it.
        </EmptyState>
      ) : (
        <Card className="divide-y p-0">
          {rows.map((r) => (
            <Link
              key={`${r.date}-${r.kind}`}
              href={`/quiz/history/${r.date}?kind=${r.kind}`}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
            >
              <span className="font-mono text-xs text-muted-foreground">{r.date}</span>
              <Badge variant="secondary">{r.kind}</Badge>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {r.attempts === 0 ? "not attempted" : `${r.attempts} attempt${r.attempts === 1 ? "" : "s"} · ${r.questions} questions`}
              </span>
              <span className={cn("font-mono tabular-nums", r.passed ? "text-success" : "text-muted-foreground")}>{r.attempts ? `${r.bestPct}%` : "–"}</span>
              <Badge variant={r.passed ? "default" : "outline"}>{r.passed ? "passed" : r.attempts ? "not passed" : "open"}</Badge>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
