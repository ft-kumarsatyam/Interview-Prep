import type { Metadata } from "next";
import Link from "next/link";
import { Keyboard, MessageCircleQuestion, Monitor, Network, RotateCcw, Server, Shuffle, Sparkles, Timer, type LucideIcon } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { interviewQuestions, interviewTracks } from "@/core/content";
import { INTERVIEW_LEVELS, interviewStats } from "@/modules/learn/domain/web-interview";
import { WEB_AREA_INFO, WEB_AREAS, type WebArea } from "@/modules/learn/domain/webdev";
import { getInterviewStatus } from "@/modules/learn/services/webdev";

export const metadata: Metadata = { title: "Interview bank" };

const AREA_ICON: Record<WebArea, LucideIcon> = { frontend: Monitor, backend: Server, architecture: Network, ai: Sparkles };

export default async function WebInterviewPage() {
  const status = await getInterviewStatus();
  const all = interviewStats(interviewQuestions, status);
  const trackArea = new Map(interviewTracks.map((t) => [t.id, t.area]));

  return (
    <>
      <BackLink href="/web">Web & AI</BackLink>
      <PageHeader
        icon={MessageCircleQuestion}
        title="Interview bank"
        description={`${all.total} interview questions across ${interviewTracks.length} topics, each with a model answer, the mistakes weak answers make and the follow-ups to expect. Practise out loud or type your answer, then compare and rate yourself; the ones you miss come back first.`}
      >
        {all.review > 0 && (
          <Button asChild>
            <Link href="/web/interview/review">
              <RotateCcw className="size-4" aria-hidden /> Review {all.review}
            </Link>
          </Button>
        )}
        <Button asChild variant={all.review > 0 ? "outline" : "default"}>
          <Link href="/web/interview/all">
            <Shuffle className="size-4" aria-hidden /> Practise everything
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Progress value={all.pct} aria-label="Overall progress" className="h-2 max-w-xs" />
          <span className="text-xs text-muted-foreground">
            <span className="tabular font-mono">{all.known}</span>/<span className="tabular font-mono">{all.total}</span> got it · <span className="tabular font-mono">{all.review}</span> to review
          </span>
          <span className="text-xs text-muted-foreground">
            {INTERVIEW_LEVELS.map((l) => `${interviewQuestions.filter((q) => q.level === l).length} ${l}`).join(" · ")}
          </span>
        </div>
        <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <li className="flex items-start gap-2 rounded-lg border p-2.5">
            <Keyboard className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden /> Practice mode lets you type a draft answer before you reveal the model answer.
          </li>
          <li className="flex items-start gap-2 rounded-lg border p-2.5">
            <Timer className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden /> Turn on the timer to rehearse the two-minute answers real interviews expect.
          </li>
          <li className="flex items-start gap-2 rounded-lg border p-2.5">
            <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden /> Questions you mark Review again come first in every later round.
          </li>
        </ul>
      </div>

      <div className="space-y-8">
        {WEB_AREAS.filter((a) => interviewTracks.some((t) => t.area === a)).map((a) => {
          const Icon = AREA_ICON[a];
          const tracks = interviewTracks.filter((t) => t.area === a);
          const s = interviewStats(interviewQuestions.filter((q) => trackArea.get(q.track) === a), status);
          return (
            <section key={a} aria-labelledby={`iv-${a}`} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                <h2 id={`iv-${a}`} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Icon className="size-5 text-primary" aria-hidden /> {WEB_AREA_INFO[a].name}
                  <span className="tabular font-mono text-xs font-normal text-muted-foreground">
                    {s.known}/{s.total}
                  </span>
                </h2>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/web/interview/area-${a}`}>
                    <Shuffle className="size-4" aria-hidden /> Mixed {a === "ai" ? "AI" : a} round
                  </Link>
                </Button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((t) => {
                  const ts = interviewStats(interviewQuestions.filter((q) => q.track === t.id), status);
                  return (
                    <li key={t.id}>
                      <Link href={`/web/interview/${t.id}`} className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">{t.name}</span>
                          <span className="tabular font-mono text-xs text-muted-foreground">
                            {ts.known}/{ts.total}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">{t.blurb}</span>
                        <span className="mt-auto flex items-center gap-2 pt-1">
                          <Progress value={ts.pct} aria-label={`${t.name} progress`} className="h-1.5" />
                          {ts.review > 0 && <span className="shrink-0 text-xs text-primary">{ts.review} to review</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
