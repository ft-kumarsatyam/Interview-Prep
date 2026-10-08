import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DsaIde } from "@/modules/dsa/components/dsa-ide";
import { ProblemHeader } from "@/modules/dsa/components/problem/problem-header";
import { SolveHistory } from "@/modules/dsa/components/problem/solve-history";
import { ProblemNotes } from "@/modules/dsa/components/problem-notes";
import { ProblemStatement, ProblemStatementSkeleton } from "@/modules/dsa/components/problem-statement-section";
import { ScratchIde } from "@/modules/dsa/components/scratch-ide";
import { SqlIde } from "@/modules/dsa/components/sql-ide";
import { problemBySlug, testcaseBySlug } from "@/core/content";
import { lessonByProblem } from "@/core/courses";
import { roadmapNodesByProblem } from "@/core/roadmaps";
import { sheetContextOf, siblingsOf } from "@/modules/dsa/domain/problem-siblings";
import { sqlProblemBySlug } from "@/modules/dsa/domain/sql-problems";
import { getProblemDetail } from "@/modules/dsa/services/problems";
import { hubSheet } from "@/modules/dsa/services/sheet-catalogue";

export async function generateMetadata({ params }: PageProps<"/dsa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: problemBySlug.get(slug)?.title ?? "Problem" };
}

/**
 * Every sheet problem opens in the IDE: problems with generated test cases get the judge (Run/Submit),
 * SQL-track problems get an in-browser database, and the rest (the JavaScript track included) get a
 * compiler-style editor and console.
 */
export default async function ProblemPage({ params, searchParams }: PageProps<"/dsa/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const detail = await getProblemDetail(slug);
  if (!detail) notFound();
  const { problem, progress } = detail;
  const solved = progress?.status === "solved";
  const entry = testcaseBySlug.get(slug);
  const sql = sqlProblemBySlug.get(slug);

  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 120) : "");
  const sheetId = one(sp.sheet);
  const fromSheet = sheetContextOf(sheetId ? hubSheet(sheetId)?.sheet : undefined, slug, one(sp.section), problemBySlug);
  const siblings = fromSheet?.siblings ?? siblingsOf(problem);
  const position = siblings.findIndex((p) => p.slug === problem.slug);
  const sheetQuery = fromSheet ? new URLSearchParams({ sheet: fromSheet.sheet.id, section: fromSheet.section }).toString() : undefined;
  const backHref = fromSheet
    ? `/dsa/sheets/${fromSheet.sheet.id}?${new URLSearchParams({ section: fromSheet.section })}`
    : `/dsa?${new URLSearchParams({ ...(problem.track === "main" ? {} : { track: problem.track }), pattern: problem.pattern }).toString()}`;

  const lesson = lessonByProblem.get(slug);
  const nodes = roadmapNodesByProblem.get(slug) ?? [];
  const onLeetCode = problem.url.startsWith("https://leetcode.com/");

  const shared = {
    title: problem.title,
    difficulty: problem.difficulty,
    pattern: problem.pattern,
    url: problem.url,
    solveCount: progress?.solveDates.length ?? 0,
    // Keyed because a still-streaming server element placed beside siblings in a client component trips React's key check.
    statement: (
      <Suspense key="statement" fallback={<ProblemStatementSkeleton />}>
        <ProblemStatement slug={problem.slug} url={problem.url} plain />
      </Suspense>
    ),
    notes: <ProblemNotes key="notes" slug={problem.slug} initial={progress?.notes ?? ""} />,
    history: <SolveHistory key="history" progress={progress} solved={solved} onLeetCode={onLeetCode} />,
  };

  return (
    <div className="space-y-3">
      <ProblemHeader
        problem={problem}
        progress={progress}
        backHref={backHref}
        backLabel={fromSheet ? `${fromSheet.sheet.title}: ${fromSheet.section}` : undefined}
        siblings={siblings}
        position={position}
        siblingQuery={sheetQuery}
      />
      {(lesson || nodes.length > 0) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Part of</span>
          {lesson && (
            <Link href={`/courses/${lesson.courseId}/${lesson.lessonId}`} className="text-primary underline-offset-2 hover:underline">
              Lesson: {lesson.title}
            </Link>
          )}
          {nodes.slice(0, 2).map((n) => (
            <Link key={`${n.roadmapId}/${n.nodeId}`} href={`/roadmaps/${n.roadmapId}#node-${n.nodeId}`} className="text-primary underline-offset-2 hover:underline">
              {n.roadmapTitle}: {n.nodeTitle}
            </Link>
          ))}
        </p>
      )}
      {entry ? (
        <DsaIde slug={problem.slug} entry={entry} revealedCases={progress?.revealedCases ?? []} onLeetCode={onLeetCode} {...shared} />
      ) : sql ? (
        <SqlIde problem={sql} {...shared} />
      ) : (
        <ScratchIde slug={problem.slug} {...shared} />
      )}
    </div>
  );
}
