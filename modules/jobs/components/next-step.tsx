import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import type { NextAction } from "@/modules/jobs/domain/job-insights";

/** One line that says what to do next in the job search. Shown on the resume and jobs pages. */
export function NextStep({ next }: { next: NextAction }) {
  const clear = next.kind === "clear";
  return (
    <Link
      href={next.href}
      className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${clear ? "border-day-done-line bg-day-done" : "border-primary/30 bg-primary/5 hover:bg-primary/10"}`}
    >
      {clear ? <CheckCircle2 className="size-5 shrink-0 text-day-done-dot" aria-hidden /> : <Compass className="size-5 shrink-0 text-primary" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{clear ? "Job search" : "Next step"}</span>
        <span className="block truncate text-sm font-semibold">{next.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{next.detail}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
