import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ResultSummary } from "@/modules/genai-test/components/result-view";
import { TestRunner } from "@/modules/genai-test/components/test-runner";
import { getResultView, getTakeView } from "@/modules/genai-test/services/test";

export const metadata: Metadata = { title: "GenAI test" };

const KIND_LABEL = { weekly: "Weekly test", cumulative: "Cumulative test", level: "Level test" } as const;

export default async function GenaiTestAttemptPage({ params }: PageProps<"/genai-test/[attemptId]">) {
  const { attemptId } = await params;
  const [take, result] = await Promise.all([getTakeView(attemptId), getResultView(attemptId)]);
  if (!take && !result) notFound();
  const kind = (take ?? result)!.kind;
  const level = (take ?? result)!.level;
  const week = (take ?? result)!.weekId.toUpperCase();
  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardCheck} title={`${KIND_LABEL[kind]}${level !== null ? ` · Level ${level}` : ` · ${week}`}`} description={take ? "Answer from memory first. The answer key stays hidden until you submit." : "Review every answer, then redo the weak topics."} />
      {take ? <TestRunner view={take} /> : result ? <ResultSummary view={result} /> : null}
      <Button asChild variant="outline" size="sm">
        <Link href="/genai-test">All tests</Link>
      </Button>
    </div>
  );
}
