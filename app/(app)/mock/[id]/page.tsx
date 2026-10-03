import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProblemStatement, ProblemStatementSkeleton } from "@/components/dsa/problem-statement";
import { MockRunner, type CodingBundle } from "@/components/mock/mock-runner";
import { ArticleMarkdown } from "@/components/news/article-markdown";
import { problemBySlug, testcaseBySlug } from "@/lib/content";
import { toRunnable } from "@/lib/domain/custom-problem";
import { MOCK_CONFIG } from "@/lib/domain/mock";
import { getCustomProblem } from "@/lib/services/custom-problems";
import { getMock } from "@/lib/services/mock";

export const metadata: Metadata = { title: "Mock interview" };

export default async function MockSessionPage({ params }: PageProps<"/mock/[id]">) {
  const { id } = await params;
  const mock = await getMock(id);
  if (!mock) notFound();
  if (mock.status !== "in_progress") redirect(`/mock/${id}/report`);

  const coding: Record<string, CodingBundle> = {};
  for (const q of mock.rounds.flatMap((r) => r.questions)) {
    if (q.kind !== "coding") continue;
    if (q.source === "sheet") {
      const entry = testcaseBySlug.get(q.slug);
      const p = problemBySlug.get(q.slug);
      if (!entry || !p) continue;
      coding[q.id] = {
        entry,
        cases: entry.cases,
        hints: entry.hints,
        statement: (
          <Suspense key={q.id} fallback={<ProblemStatementSkeleton />}>
            <ProblemStatement slug={p.slug} url={p.url} plain hideHints />
          </Suspense>
        ),
      };
    } else {
      const cp = await getCustomProblem(q.slug);
      if (!cp) continue;
      const r = toRunnable(cp);
      coding[q.id] = { entry: r, cases: r.cases, hints: r.hints, statement: <ArticleMarkdown key={q.id} markdown={cp.statementMd} /> };
    }
  }

  return (
    <div data-ide className="contents">
      <h1 className="sr-only">{MOCK_CONFIG[mock.type].label} mock interview</h1>
      <MockRunner id={mock.id} type={mock.type} deadlineAt={mock.deadlineAt} serverNow={new Date().getTime()} rounds={mock.rounds} answers={mock.answers} coding={coding} />
    </div>
  );
}
