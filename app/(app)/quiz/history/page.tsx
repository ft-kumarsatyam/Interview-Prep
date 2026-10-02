import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleDashed, History, ListChecks, XCircle } from "lucide-react";
import { prettyDate } from "@/components/quiz/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listQuizHistory, type QuizHistoryRow } from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz history" };

export default async function QuizHistoryPage() {
  const rows = await listQuizHistory();
  const attempted = rows.filter((r) => r.attempts > 0);
  const passed = attempted.filter((r) => r.passed).length;
  const avg = attempted.length ? Math.round(attempted.reduce((s, r) => s + r.bestPct, 0) / attempted.length) : 0;

  return (
    <>
      <Link href="/quiz" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Quiz
      </Link>
      <PageHeader title="Quiz history" icon={History} description="Every daily and weekly quiz with your best score. Open one to review it and practise what you missed." />
      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No quizzes yet"
          action={
            <Button asChild size="lg" className="h-10 px-4">
              <Link href="/quiz">
                <ListChecks /> Go to today&apos;s quiz
              </Link>
            </Button>
          }
        >
          Your first quiz appears here once you start it.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <Summary label="Taken" value={String(attempted.length)} />
            <Summary label="Passed" value={`${passed}/${attempted.length}`} tone={attempted.length > 0 && passed === attempted.length ? "success" : undefined} />
            <Summary label="Avg best" value={attempted.length ? `${avg}%` : "–"} />
          </dl>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={`${r.date}-${r.kind}`}>
                <HistoryRow row={r} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <Card size="sm">
      <CardContent>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={cn("font-mono text-lg font-semibold tabular-nums sm:text-xl", tone === "success" && "text-success")}>{value}</dd>
      </CardContent>
    </Card>
  );
}

function HistoryRow({ row: r }: { row: QuizHistoryRow }) {
  const status = r.passed ? "passed" : r.attempts ? "not passed" : "not attempted";
  const StatusIcon = r.passed ? CheckCircle2 : r.attempts ? XCircle : CircleDashed;
  return (
    <Link
      href={`/quiz/history/${r.date}?kind=${r.kind}`}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4"
    >
      <StatusIcon
        className={cn("size-5 shrink-0", r.passed ? "text-success" : r.attempts ? "text-destructive" : "text-muted-foreground")}
        aria-label={status}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
          {prettyDate(r.date)}
          <Badge variant="secondary" className="capitalize">
            {r.kind}
          </Badge>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {r.attempts === 0 ? "Started, not submitted" : `${r.attempts} attempt${r.attempts === 1 ? "" : "s"} · ${r.questions} questions`}
          {r.generatedBy === "bank" ? " · offline bank" : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("font-mono text-base font-semibold tabular-nums", r.passed ? "text-success" : r.attempts ? "text-foreground" : "text-muted-foreground")}>
          {r.attempts ? `${r.bestPct}%` : "–"}
        </span>
        <span className="text-[11px] text-muted-foreground capitalize">{status}</span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
