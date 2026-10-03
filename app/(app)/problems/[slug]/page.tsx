import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CustomProblemIde } from "@/components/problems/custom-problem-ide";
import { getCustomProblem } from "@/lib/services/custom-problems";
import { cn } from "@/lib/utils";

const DIFF_CLASS = { Easy: "text-success", Medium: "text-warning", Hard: "text-destructive" } as const;

export async function generateMetadata({ params }: PageProps<"/problems/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getCustomProblem(slug);
  return { title: p?.title ?? "Problem" };
}

export default async function CustomProblemPage({ params }: PageProps<"/problems/[slug]">) {
  const { slug } = await params;
  const problem = await getCustomProblem(slug);
  if (!problem) notFound();

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/problems" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Back to problems">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="min-w-0 truncate text-lg font-semibold">{problem.title}</h1>
        <span className={cn("shrink-0 text-xs font-medium", DIFF_CLASS[problem.difficulty])}>{problem.difficulty}</span>
        {problem.solvedOn && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> Solved {problem.solvedOn}
          </span>
        )}
      </div>
      <CustomProblemIde problem={problem} />
    </div>
  );
}
