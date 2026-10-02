import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleDot, ExternalLink, RefreshCw } from "lucide-react";
import { AskGemini } from "@/components/ai/ask-gemini";
import { CodeRunner } from "@/components/dsa/code-runner";
import { ProblemStatement, ProblemStatementSkeleton } from "@/components/dsa/problem-statement";
import { ProblemNotes } from "@/components/dsa/problem-notes";
import { ProblemWorkspace } from "@/components/dsa/problem-workspace";
import { SolveButton } from "@/components/progress/solve-button";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { problemBySlug, problems, testcaseBySlug, type ContentProblem } from "@/lib/content";
import { dsaPrompt } from "@/lib/domain/ask-prompt";
import { askSubjectForRef } from "@/lib/quiz/subject";
import { formatDate } from "@/lib/plan-clock";
import { getProblemDetail, type ProblemDetail } from "@/lib/services/problems";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/dsa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: problemBySlug.get(slug)?.title ?? "Problem" };
}

/** Same-pattern problems in plan order (core before extended), for prev/next navigation. */
function siblingsOf(problem: ContentProblem): ContentProblem[] {
  return problems
    .filter((p) => p.track === problem.track && p.pattern === problem.pattern)
    .toSorted((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1));
}

export default async function ProblemPage({ params }: PageProps<"/dsa/[slug]">) {
  const { slug } = await params;
  const detail = await getProblemDetail(slug);
  if (!detail) notFound();
  const { problem, progress } = detail;
  const solved = progress?.status === "solved";
  const lastSolved = progress?.solveDates.at(-1);
  const entry = testcaseBySlug.get(slug);

  const siblings = siblingsOf(problem);
  const position = siblings.findIndex((p) => p.slug === problem.slug);
  const prev = position > 0 ? siblings[position - 1] : undefined;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined;
  const backHref = `/dsa?${new URLSearchParams({ ...(problem.track === "main" ? {} : { track: problem.track }), pattern: problem.pattern }).toString()}`;

  return (
    <div className="space-y-5">
      <nav className="flex items-center justify-between gap-2" aria-label="Problem navigation">
        <Link href={backHref} className="inline-flex min-h-9 min-w-0 items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <ChevronLeft className="size-4 shrink-0" />
          <span className="shrink-0">DSA</span>
          <span aria-hidden>/</span>
          <span className="truncate">{problem.pattern}</span>
        </Link>
        {siblings.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <span className="tabular mr-1 font-mono text-xs text-muted-foreground">
              {position + 1}/{siblings.length}
            </span>
            <SiblingButton problem={prev} direction="prev" />
            <SiblingButton problem={next} direction="next" />
          </div>
        )}
      </nav>

      <header className="space-y-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            LC #{problem.leetcodeId} · {problem.track === "main" ? `${problem.tier === "core" ? "Core" : "Extended"} · #${problem.order}` : problem.track.toUpperCase()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{problem.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <DifficultyBadge difficulty={problem.difficulty} />
            <StatusChip progress={progress} lastSolved={lastSolved} />
            {progress?.source === "leetcode" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <RefreshCw className="size-3" aria-hidden /> synced from LeetCode
              </span>
            )}
            {progress?.nextReviewAt && (
              <span className="inline-flex items-center gap-1 text-xs">
                <CalendarClock className="size-3.5" aria-hidden /> review {formatDate(progress.nextReviewAt)}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>button]:w-full sm:[&>button]:w-auto [&>*:first-child]:col-span-2">
          <SolveButton
            target={{ slug: problem.slug, title: problem.title, date: progress?.needsDetails ? lastSolved : undefined }}
            label={progress?.needsDetails ? "Fill in details" : solved ? "Log a re-solve" : "Mark solved"}
            variant={solved && !progress?.needsDetails ? "secondary" : "default"}
          />
          <Button size="lg" variant="outline" asChild>
            <a href={problem.url} target="_blank" rel="noreferrer">
              <span className="sm:hidden">LeetCode</span>
              <span className="hidden sm:inline">Open on LeetCode</span>
              <ExternalLink />
            </a>
          </Button>
          <AskGemini
            subject={askSubjectForRef(problem.slug)}
            label="Ask Gemini"
            className="h-9 w-full sm:w-auto"
            prompt={dsaPrompt({ title: problem.title, difficulty: problem.difficulty, pattern: problem.pattern, code: "(I haven't written anything yet. Walk me through how to think about it.)" })}
          />
        </div>
      </header>

      <ProblemWorkspace
        solveCount={progress?.solveDates.length ?? 0}
        statement={
          <Suspense fallback={<ProblemStatementSkeleton />}>
            <ProblemStatement slug={problem.slug} url={problem.url} />
          </Suspense>
        }
        code={
          entry ? (
            <CodeRunner slug={problem.slug} title={problem.title} entry={entry} difficulty={problem.difficulty} pattern={problem.pattern} url={problem.url} revealedCases={progress?.revealedCases ?? []} />
          ) : undefined
        }
        notes={
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ProblemNotes slug={problem.slug} initial={progress?.notes ?? ""} />
            </CardContent>
          </Card>
        }
        history={<History progress={progress} solved={solved} />}
      />

      {(prev || next) && (
        <nav className="grid gap-2 border-t pt-5 sm:grid-cols-2" aria-label={`More ${problem.pattern} problems`}>
          {prev ? <SiblingCard problem={prev} direction="prev" /> : <span className="hidden sm:block" />}
          {next && <SiblingCard problem={next} direction="next" />}
        </nav>
      )}
    </div>
  );
}

function StatusChip({ progress, lastSolved }: { progress: ProblemDetail["progress"]; lastSolved?: string }) {
  if (progress?.status === "solved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" aria-hidden /> Solved{lastSolved && ` · ${formatDate(lastSolved, { day: "numeric", month: "short" })}`}
      </span>
    );
  }
  if (progress?.status === "attempted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning">
        <CircleDot className="size-3.5" aria-hidden /> Attempted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
      <Circle className="size-3.5" aria-hidden /> Not started
    </span>
  );
}

function SiblingButton({ problem, direction }: { problem?: ContentProblem; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous problem" : "Next problem";
  if (!problem) {
    return (
      <Button variant="outline" size="icon-lg" disabled aria-label={label}>
        <Icon />
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon-lg" asChild>
      <Link href={`/dsa/${problem.slug}`} aria-label={`${label}: ${problem.title}`} title={problem.title}>
        <Icon />
      </Link>
    </Button>
  );
}

function SiblingCard({ problem, direction }: { problem: ContentProblem; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/dsa/${problem.slug}`}
      className={cn(
        "group flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isNext && "flex-row-reverse text-right sm:col-start-2",
      )}
    >
      {isNext ? <ChevronRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" /> : <ChevronLeft className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{isNext ? "Next in pattern" : "Previous"}</span>
        <span className="block truncate font-medium group-hover:text-primary">{problem.title}</span>
      </span>
      <DifficultyBadge difficulty={problem.difficulty} />
    </Link>
  );
}

function History({ progress, solved }: { progress: ProblemDetail["progress"]; solved: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
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
                <dd className="text-pretty">{progress?.approach || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Next review</dt>
                <dd>{progress?.nextReviewAt ? formatDate(progress.nextReviewAt) : "Not scheduled"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not solved yet. Read the problem, solve it in JavaScript, then tap Mark solved.</p>
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
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                  <span className="font-medium">{i === 0 ? "First solve" : `Re-solve ${i}`}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No solves logged yet. Each solve and re-solve shows up here.</p>
          )}
        </CardContent>
      </Card>
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
