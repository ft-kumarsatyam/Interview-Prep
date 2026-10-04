import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentProblem } from "@/core/content";

/** Previous/next problem within the same pattern. Disabled at either end. */
export function SiblingButton({ problem, direction }: { problem?: ContentProblem; direction: "prev" | "next" }) {
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
