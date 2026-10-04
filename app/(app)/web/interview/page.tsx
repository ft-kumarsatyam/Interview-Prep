import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion, RotateCcw } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { interviewQuestions, interviewTracks } from "@/lib/content";
import { interviewStats } from "@/lib/domain/web-interview";
import { getInterviewStatus } from "@/lib/services/webdev";

export const metadata: Metadata = { title: "Web interview prep" };

export default async function WebInterviewPage() {
  const status = await getInterviewStatus();
  const all = interviewStats(interviewQuestions, status);

  return (
    <>
      <BackLink href="/web">Web development</BackLink>
      <PageHeader
        icon={MessageCircleQuestion}
        title="Web interview prep"
        description={`${all.total} interview questions across ${interviewTracks.length} topics, each with a model answer, the mistakes weak answers make and the follow-ups to expect. Rate each one and the ones you miss come back first.`}
      >
        {all.review > 0 && (
          <Button asChild>
            <Link href="/web/interview/review">
              <RotateCcw className="size-4" aria-hidden /> Review {all.review}
            </Link>
          </Button>
        )}
        <Button asChild variant={all.review > 0 ? "outline" : "default"}>
          <Link href="/web/interview/all">Practise everything</Link>
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Progress value={all.pct} aria-label="Overall progress" className="h-2 max-w-xs" />
        <span className="text-xs text-muted-foreground">
          <span className="tabular font-mono">{all.known}</span>/<span className="tabular font-mono">{all.total}</span> got it · <span className="tabular font-mono">{all.review}</span> to review
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {interviewTracks.map((t) => {
          const s = interviewStats(interviewQuestions.filter((q) => q.track === t.id), status);
          return (
            <li key={t.id}>
              <Link href={`/web/interview/${t.id}`} className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="tabular font-mono text-xs text-muted-foreground">
                    {s.known}/{s.total}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{t.blurb}</span>
                <span className="mt-auto flex items-center gap-2 pt-1">
                  <Progress value={s.pct} aria-label={`${t.name} progress`} className="h-1.5" />
                  {s.review > 0 && <span className="shrink-0 text-xs text-primary">{s.review} to review</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
