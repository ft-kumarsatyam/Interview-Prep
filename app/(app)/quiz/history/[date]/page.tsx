import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, ListFilter, PartyPopper, XCircle } from "lucide-react";
import { prettyDate } from "@/components/quiz/format";
import { PracticeWrong } from "@/components/quiz/practice-wrong";
import { QuestionReview } from "@/components/quiz/question-review";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { isDateStr } from "@/lib/domain/dates";
import { chosenIndices, correctIndices, isAnswerCorrect } from "@/lib/domain/quiz";
import { askSubjectForRef } from "@/lib/quiz/subject";
import { getQuizReview } from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz review" };

export default async function QuizReviewPage({ params, searchParams }: PageProps<"/quiz/history/[date]">) {
  const { date } = await params;
  const { kind: rawKind, show } = await searchParams;
  const kind = rawKind === "weekly" ? "weekly" : "daily";
  if (!isDateStr(date)) notFound();
  const review = await getQuizReview(date, kind);
  const title = `${kind === "weekly" ? "Weekly" : "Daily"} quiz · ${prettyDate(date)}`;

  const back = (
    <Link href="/quiz/history" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> History
    </Link>
  );

  if (!review) {
    return (
      <>
        {back}
        <PageHeader title={title} />
        <EmptyState icon={CircleDashed} title="Nothing to review yet">
          This quiz was started but never submitted.
        </EmptyState>
      </>
    );
  }

  const graded = review.items.map((q, i) => ({ q, i, right: isAnswerCorrect(q, q.chosen) }));
  const wrong = graded.filter((g) => !g.right);
  const wrongOnly = show === "wrong" && wrong.length > 0;
  const shown = wrongOnly ? wrong : graded;
  const correct = graded.length - wrong.length;
  const href = (s?: string) => `/quiz/history/${date}?kind=${kind}${s ? `&show=${s}` : ""}`;

  return (
    <>
      {back}
      <PageHeader
        title={title}
        description={
          <>
            Last attempt: {correct} of {graded.length} correct
          </>
        }
      >
        <Badge
          variant="outline"
          className={cn("h-7 gap-1.5 px-2.5 font-mono text-sm tabular-nums", review.passed ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}
        >
          {review.passed ? <CheckCircle2 aria-hidden /> : <XCircle aria-hidden />}
          {review.pct}% · {review.passed ? "passed" : "not passed"}
        </Badge>
      </PageHeader>

      <PracticeWrong
        questions={wrong.map(({ q }) => ({
          id: q.id,
          prompt: q.prompt,
          code: q.code,
          options: q.options,
          answerIndex: q.answerIndex,
          ...(q.type ? { type: q.type } : {}),
          ...(q.answerIndices ? { answerIndices: q.answerIndices } : {}),
          subject: askSubjectForRef(q.source?.ref),
          explanation: q.explanation,
        }))}
      />

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Review answers</h2>
        <nav className="inline-flex rounded-lg border bg-muted/40 p-0.5" aria-label="Filter questions">
          <FilterLink href={href()} active={!wrongOnly}>
            All ({graded.length})
          </FilterLink>
          {wrong.length > 0 ? (
            <FilterLink href={href("wrong")} active={wrongOnly}>
              <ListFilter className="size-3.5" aria-hidden /> Wrong only ({wrong.length})
            </FilterLink>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 px-3 text-xs text-success">
              <PartyPopper className="size-3.5" aria-hidden /> None wrong
            </span>
          )}
        </nav>
      </div>
      <ol className="space-y-3">
        {shown.map(({ q, i, right }) => (
          <li key={q.id}>
            <QuestionReview
              number={i + 1}
              prompt={q.prompt}
              code={q.code}
              options={q.options}
              multi={q.type === "multi"}
              chosen={chosenIndices(q, q.chosen, q.options.length)}
              correct={correctIndices(q)}
              right={right}
              explanation={q.explanation}
              subject={askSubjectForRef(q.source?.ref)}
            />
          </li>
        ))}
      </ol>
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
