import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProblemList } from "@/modules/progress/components/problem-list";
import type { PlanProblem } from "@/modules/progress/services/dashboard";

const toItem = (p: PlanProblem, tag?: string) => ({
  slug: p.slug,
  title: p.title,
  difficulty: p.difficulty,
  pattern: p.pattern,
  url: p.url,
  solved: p.solvedToday,
  tag,
});

/** Today's DSA work, grouped into new problems, reviews and JS/SQL side tracks. */
export function ProblemsCard({ problems }: { problems: PlanProblem[] }) {
  const newProblems = problems.filter((p) => p.role === "new");
  const reviews = problems.filter((p) => p.role === "review");
  const sideTrack = problems.filter((p) => p.role === "js" || p.role === "sql");
  return (
    <Card id="problems" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Today&apos;s problems</CardTitle>
        <CardDescription>Every problem solved today counts: new, review, JS and SQL.</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dsa">
              All <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProblemList items={newProblems.map((p) => toItem(p))} empty="No new problems today." />
        {reviews.length > 0 && (
          <div>
            <SectionHeading level={3} eyebrow className="mb-1" title="Review due" />
            <ProblemList items={reviews.map((p) => toItem(p, p.confidence ?? "review"))} />
          </div>
        )}
        {sideTrack.length > 0 && (
          <div>
            <SectionHeading level={3} eyebrow className="mb-1" title="Side tracks" />
            <ProblemList items={sideTrack.map((p) => toItem(p, p.role === "js" ? "JS track" : "SQL"))} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
