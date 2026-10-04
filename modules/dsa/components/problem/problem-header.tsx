import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import type { ContentProblem } from "@/core/content";
import { SolveButton } from "@/modules/progress/components/solve-button";
import type { ProblemDetail } from "@/modules/dsa/services/problems";
import { ProblemStatusChip } from "./problem-status-chip";
import { SiblingButton } from "./sibling-button";

type Props = {
  problem: ContentProblem;
  progress: ProblemDetail["progress"];
  backHref: string;
  siblings: ContentProblem[];
  position: number;
};

/** Title row: back link, status, solve action and prev/next navigation. */
export function ProblemHeader({ problem, progress, backHref, siblings, position }: Props) {
  const solved = progress?.status === "solved";
  const lastSolved = progress?.solveDates.at(-1);
  const prev = position > 0 ? siblings[position - 1] : undefined;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined;
  return (
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
      <ProblemStatusChip progress={progress} lastSolved={lastSolved} />
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
  );
}
