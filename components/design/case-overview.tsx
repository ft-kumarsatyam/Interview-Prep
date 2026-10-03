import Link from "next/link";
import { ArrowRight, PartyPopper, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DesignStatus } from "@/lib/domain/design";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./case-status";

export interface CaseCardData {
  slug: string;
  href: string;
  title: string;
  summary: string;
  level: "core" | "advanced";
  category?: string;
  keywords: string[];
  status: DesignStatus;
  subtopicsDone: number;
  subtopicsTotal: number;
  sectionsAttempted: number;
  sectionsTotal: number;
  minutesSpent: number;
}

const ORDER: DesignStatus[] = ["mastered", "practised", "studying", "new"];

/** The case to resume: a half-written mock first, then any case in progress, then the first one not started. */
export function pickContinue(cases: readonly CaseCardData[]): { item: CaseCardData; resume: boolean } | null {
  const inProgress = cases
    .filter((c) => c.status === "studying" || c.status === "practised")
    .sort((a, b) => {
      const aPartial = a.sectionsAttempted > 0 && a.sectionsAttempted < a.sectionsTotal ? 1 : 0;
      const bPartial = b.sectionsAttempted > 0 && b.sectionsAttempted < b.sectionsTotal ? 1 : 0;
      return bPartial - aPartial || b.sectionsAttempted - a.sectionsAttempted || b.minutesSpent - a.minutesSpent;
    });
  if (inProgress[0]) return { item: inProgress[0], resume: true };
  const next = cases.find((c) => c.status === "new");
  return next ? { item: next, resume: false } : null;
}

export function CaseOverview({ cases }: { cases: readonly CaseCardData[] }) {
  const counts = cases.reduce<Record<DesignStatus, number>>((acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }), {
    new: 0,
    studying: 0,
    practised: 0,
    mastered: 0,
  });
  const total = cases.length;
  const done = counts.mastered + counts.practised;
  const pick = pickContinue(cases);

  return (
    <section aria-label="Your progress" className="mb-8 grid gap-4 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-center md:gap-6">
      <div className="min-w-0 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Progress</h2>
          <p className="text-sm">
            <span className="font-mono text-lg font-semibold tabular">{done}</span>
            <span className="text-muted-foreground"> / {total} practised or mastered</span>
          </p>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${counts.mastered} mastered, ${counts.practised} practised, ${counts.studying} studying, ${counts.new} not started`}>
          {ORDER.filter((s) => s !== "new").map((s) =>
            counts[s] > 0 ? <span key={s} className={cn("h-full", STATUS_META[s].bar)} style={{ width: `${(counts[s] / Math.max(total, 1)) * 100}%` }} /> : null,
          )}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ORDER.map((s) => {
            const Icon = STATUS_META[s].icon;
            return (
              <li key={s} className="inline-flex items-center gap-1">
                <Icon className={cn("size-3.5", STATUS_META[s].text)} aria-hidden />
                <span className="font-mono tabular text-foreground">{counts[s]}</span> {STATUS_META[s].label.toLowerCase()}
              </li>
            );
          })}
        </ul>
      </div>

      {pick ? (
        <Link
          href={pick.item.href}
          className="group flex min-w-0 items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-primary">{pick.resume ? "Continue where you left off" : "Start here"}</span>
            <span className="block truncate font-medium">{pick.item.title}</span>
            <span className="block text-xs text-muted-foreground">
              {pick.resume && pick.item.sectionsAttempted > 0
                ? `${pick.item.sectionsAttempted}/${pick.item.sectionsTotal} sections written`
                : STATUS_META[pick.item.status].label}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
          <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
          <span>Every case is mastered. Re-run a mock to keep it fresh.</span>
        </div>
      )}
    </section>
  );
}

export function JumpLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label="On this page" className="-mx-4 mb-6 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Button asChild size="sm" variant="outline" className="h-9 rounded-full px-3.5">
              <a href={l.href}>{l.label}</a>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
