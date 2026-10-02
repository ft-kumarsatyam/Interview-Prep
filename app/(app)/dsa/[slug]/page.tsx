import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { ProblemNotes } from "@/components/dsa/problem-notes";
import { SolveButton } from "@/components/progress/solve-button";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { problemBySlug } from "@/lib/content";
import { formatDate } from "@/lib/plan-clock";
import { getProblemDetail } from "@/lib/services/problems";

export async function generateMetadata({ params }: PageProps<"/dsa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: problemBySlug.get(slug)?.title ?? "Problem" };
}

export default async function ProblemPage({ params }: PageProps<"/dsa/[slug]">) {
  const { slug } = await params;
  const detail = await getProblemDetail(slug);
  if (!detail) notFound();
  const { problem, progress } = detail;
  const solved = progress?.status === "solved";
  const lastSolved = progress?.solveDates.at(-1);

  return (
    <div className="space-y-6">
      <Link href="/dsa" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> DSA
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            #{problem.leetcodeId} · {problem.track === "main" ? `${problem.tier} · order ${problem.order}` : problem.track.toUpperCase()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{problem.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <DifficultyBadge difficulty={problem.difficulty} />
            <span>{problem.pattern}</span>
            {progress?.source === "leetcode" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <RefreshCw className="size-3" /> synced from LeetCode
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" asChild>
            <a href={problem.url} target="_blank" rel="noreferrer">
              Open on LeetCode <ExternalLink />
            </a>
          </Button>
          <SolveButton
            target={{ slug: problem.slug, title: problem.title, date: progress?.needsDetails ? lastSolved : undefined }}
            label={progress?.needsDetails ? "Fill in details" : solved ? "Log a re-solve" : "Mark solved"}
            variant={solved && !progress?.needsDetails ? "secondary" : "default"}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ProblemNotes slug={problem.slug} initial={progress?.notes ?? ""} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Last solve</CardTitle>
            </CardHeader>
            <CardContent>
              {solved ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Confidence" value={progress?.needsDetails ? "not rated" : (progress?.confidence ?? "—")} />
                  <Stat label="Minutes" value={progress?.timeTakenMin != null ? String(progress.timeTakenMin) : "—"} />
                  <Stat label="Time" value={progress?.timeComplexity || "—"} mono />
                  <Stat label="Space" value={progress?.spaceComplexity || "—"} mono />
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Approach</dt>
                    <dd>{progress?.approach || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Next review</dt>
                    <dd>{progress?.nextReviewAt ? formatDate(progress.nextReviewAt) : "Not scheduled"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Not solved yet. Open it on LeetCode, solve it in JavaScript, then log it here.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review history</CardTitle>
            </CardHeader>
            <CardContent>
              {progress?.solveDates.length ? (
                <ol className="relative space-y-3 border-l pl-4">
                  {progress.solveDates.map((d, i) => (
                    <li key={d} className="text-sm">
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" />
                      <span className="font-medium">{i === 0 ? "First solve" : `Re-solve ${i}`}</span>
                      <span className="block text-xs text-muted-foreground">{formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No solves logged.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}
