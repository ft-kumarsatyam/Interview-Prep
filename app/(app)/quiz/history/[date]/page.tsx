import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Code2, X } from "lucide-react";
import { PracticeWrong } from "@/components/quiz/practice-wrong";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { isDateStr } from "@/lib/domain/dates";
import { playgroundHref } from "@/lib/playground/share";
import { getQuizReview } from "@/lib/services/quiz";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz review" };

export default async function QuizReviewPage({ params, searchParams }: PageProps<"/quiz/history/[date]">) {
  const { date } = await params;
  const { kind: rawKind } = await searchParams;
  const kind = rawKind === "weekly" ? "weekly" : "daily";
  if (!isDateStr(date)) notFound();
  const review = await getQuizReview(date, kind);

  return (
    <>
      <Link href="/quiz/history" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> History
      </Link>
      {!review ? (
        <PageHeader title={`${kind === "weekly" ? "Weekly" : "Daily"} quiz · ${date}`} description="Not attempted yet, so there's nothing to review." />
      ) : (
        <>
          <PageHeader
            title={`${kind === "weekly" ? "Weekly" : "Daily"} quiz · ${date}`}
            description={`Last attempt ${review.pct}% · ${review.passed ? "passed" : "not passed"}`}
          />
          <PracticeWrong
            questions={review.items
              .filter((q) => q.chosen !== q.answerIndex)
              .map((q) => ({ id: q.id, prompt: q.prompt, code: q.code, options: q.options, answerIndex: q.answerIndex, explanation: q.explanation }))}
          />
          <ol className="mt-6 space-y-3">
            {review.items.map((q, i) => {
              const right = q.chosen === q.answerIndex;
              return (
                <li key={q.id}>
                  <Card className={cn("border-l-4", right ? "border-l-success" : "border-l-destructive")}>
                    <CardContent className="space-y-2 text-sm">
                      <p className="flex items-start gap-2 font-medium">
                        {right ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" />}
                        <span>
                          {i + 1}. {q.prompt}
                        </span>
                      </p>
                      {q.code && <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">{q.code}</pre>}
                      {!right && (
                        <p className="text-muted-foreground">
                          Your answer: <span className={cn(q.code && "font-mono text-xs whitespace-pre-wrap")}>{q.chosen === null ? "(skipped)" : q.options[q.chosen]}</span>
                        </p>
                      )}
                      <p>
                        Correct: <span className={cn(q.code && "font-mono text-xs whitespace-pre-wrap")}>{q.options[q.answerIndex]}</span>
                      </p>
                      {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
                      {!right && q.code && (
                        <Link href={playgroundHref(q.code)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Code2 className="size-3" /> Run it in the Playground
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
