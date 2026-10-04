import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Play, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMistakesOverview } from "@/modules/quiz/services/practice";

export const metadata: Metadata = { title: "Mistakes" };

const reviewHref = (track?: string) => `/learn/practice?ref=${encodeURIComponent(track ? `mistakes:${track}` : "mistakes")}`;

export default async function MistakesPage() {
  const overview = await getMistakesOverview();

  return (
    <>
      <Link href="/quiz" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Quiz
      </Link>
      <PageHeader
        title="Mistakes"
        icon={RotateCcw}
        description="Every question whose latest answer was wrong, from practice runs and daily or weekly quizzes. Answer it right in a review and it leaves the list."
      >
        {overview.total > 0 && (
          <Button asChild size="lg" className="h-9">
            <Link href={reviewHref()}>
              <Play /> Review all ({overview.total})
            </Link>
          </Button>
        )}
      </PageHeader>
      {overview.total === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to fix"
          action={
            <Button asChild size="lg" className="h-10 px-4">
              <Link href="/learn">Practice in Learn</Link>
            </Button>
          }
        >
          Questions you miss in practice runs and daily or weekly quizzes collect here, so the revision weeks can focus on them.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <section aria-labelledby="by-track" className="space-y-2">
            <h2 id="by-track" className="text-sm font-semibold">
              By track
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {overview.byTrack.map((t) => (
                <li key={t.track}>
                  <Link
                    href={reviewHref(t.track)}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {t.count} to fix <Play className="ml-1 inline size-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="most-missed" className="space-y-2">
            <h2 id="most-missed" className="text-sm font-semibold">
              Most missed
            </h2>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {overview.top.map((q) => (
                    <li key={q.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-pretty">{q.prompt}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{q.where}</p>
                      </div>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        missed {q.wrong} of {q.attempts}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
