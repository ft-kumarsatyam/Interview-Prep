import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleDot, ExternalLink } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { DsaIde } from "@/components/dsa/dsa-ide";
import { ProblemStatement, ProblemStatementSkeleton } from "@/components/dsa/problem-statement";
import { ProblemNotes } from "@/components/dsa/problem-notes";
import { ScratchIde } from "@/components/dsa/scratch-ide";
import { SqlIde } from "@/components/dsa/sql-ide";
import { SolveButton } from "@/components/progress/solve-button";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { problemBySlug, problems, testcaseBySlug, type ContentProblem } from "@/lib/content";
import { sqlProblemBySlug } from "@/lib/domain/sql-problems";
import { formatDate } from "@/lib/plan-clock";
import { getProblemDetail, type ProblemDetail } from "@/lib/services/problems";

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

/**
 * Every sheet problem opens in the IDE: problems with generated test cases get the judge (Run/Submit),
 * SQL-track problems get an in-browser database, and the rest (the JavaScript track included) get a
 * compiler-style editor and console.
 */
export default async function ProblemPage({ params }: PageProps<"/dsa/[slug]">) {
  const { slug } = await params;
  const detail = await getProblemDetail(slug);
  if (!detail) notFound();
  const { problem, progress } = detail;
  const solved = progress?.status === "solved";
  const lastSolved = progress?.solveDates.at(-1);
  const entry = testcaseBySlug.get(slug);
  const sql = sqlProblemBySlug.get(slug);

  const siblings = siblingsOf(problem);
  const position = siblings.findIndex((p) => p.slug === problem.slug);
  const prev = position > 0 ? siblings[position - 1] : undefined;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined;
  const backHref = `/dsa?${new URLSearchParams({ ...(problem.track === "main" ? {} : { track: problem.track }), pattern: problem.pattern }).toString()}`;

  const shared = {
    title: problem.title,
    difficulty: problem.difficulty,
    pattern: problem.pattern,
    url: problem.url,
    solveCount: progress?.solveDates.length ?? 0,
    statement: (
      <Suspense fallback={<ProblemStatementSkeleton />}>
        <ProblemStatement slug={problem.slug} url={problem.url} plain />
      </Suspense>
    ),
    notes: <ProblemNotes slug={problem.slug} initial={progress?.notes ?? ""} />,
    history: <History progress={progress} solved={solved} />,
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={backHref}
          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Back to ${problem.pattern}`}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden max-w-40 truncate sm:inline">{problem.pattern}</span>
        </Link>
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
          <span className="mr-1.5 font-mono text-sm font-normal text-muted-foreground">{problem.leetcodeId}.</span>
          {problem.title}
        </h1>
        <DifficultyBadge difficulty={problem.difficulty} />
        <StatusChip progress={progress} lastSolved={lastSolved} />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <SolveButton
            size="sm"
            target={{ slug: problem.slug, title: problem.title, date: progress?.needsDetails ? lastSolved : undefined }}
            label={progress?.needsDetails ? "Fill in details" : solved ? "Log re-solve" : "Mark solved"}
            variant={solved && !progress?.needsDetails ? "secondary" : "outline"}
          />
          <Button size="icon" variant="outline" className="size-8" asChild>
            <a href={problem.url} target="_blank" rel="noreferrer" aria-label="Open on LeetCode" title="Open on LeetCode">
              <ExternalLink />
            </a>
          </Button>
          {siblings.length > 1 && (
            <>
              <span className="tabular hidden font-mono text-xs text-muted-foreground md:inline">
                {position + 1}/{siblings.length}
              </span>
              <SiblingButton problem={prev} direction="prev" />
              <SiblingButton problem={next} direction="next" />
            </>
          )}
        </div>
      </header>
      {entry ? (
        <DsaIde slug={problem.slug} entry={entry} revealedCases={progress?.revealedCases ?? []} {...shared} />
      ) : sql ? (
        <SqlIde problem={sql} {...shared} />
      ) : (
        <ScratchIde slug={problem.slug} {...shared} />
      )}
    </div>
  );
}

function StatusChip({ progress, lastSolved }: { progress: ProblemDetail["progress"]; lastSolved?: string }) {
  if (progress?.status === "solved") {
    return (
      <ToneBadge tone="success" icon={CheckCircle2}>Solved{lastSolved && ` · ${formatDate(lastSolved, { day: "numeric", month: "short" })}`}</ToneBadge>
    );
  }
  if (progress?.status === "attempted") {
    return (
      <ToneBadge tone="warning" icon={CircleDot}>Attempted</ToneBadge>
    );
  }
  return (
    <ToneBadge tone="neutral" icon={Circle}>Not started</ToneBadge>
  );
}

function SiblingButton({ problem, direction }: { problem?: ContentProblem; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous problem" : "Next problem";
  if (!problem) {
    return (
      <Button variant="outline" size="icon" className="size-8" disabled aria-label={label}>
        <Icon />
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" className="size-8" asChild>
      <Link href={`/dsa/${problem.slug}`} aria-label={`${label}: ${problem.title}`} title={problem.title}>
        <Icon />
      </Link>
    </Button>
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
            <p className="text-sm text-muted-foreground">Not solved yet. Solve it here, submit it on LeetCode, then tap Mark solved.</p>
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
