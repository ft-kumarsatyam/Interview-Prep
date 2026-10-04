"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, PlayCircle, RefreshCw } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatusIcon } from "@/components/shared/status-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import type { ContentProblem } from "@/lib/content";
import { formatDate } from "@/lib/plan-clock";
import type { ProgressSummary } from "@/lib/services/problems";
import { cn } from "@/lib/utils";

function ProblemStatusIcon({ prog }: { prog?: ProgressSummary }) {
  if (prog?.status === "solved") return <StatusIcon kind="done" label="Solved" />;
  if (prog?.status === "attempted") return <StatusIcon kind="partial" label="Attempted" />;
  return <StatusIcon kind="todo" label="Not started" />;
}

export function ProblemRow({ p, prog, isNext, video }: { p: ContentProblem; prog?: ProgressSummary; isNext?: boolean; video?: string }) {
  return (
    <li className={cn("flex items-center gap-1 rounded-lg", isNext && "bg-primary/5 ring-1 ring-primary/30")}>
      <Link
        href={`/dsa/${p.slug}`}
        className="group flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ProblemStatusIcon prog={prog} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground group-hover:text-primary">{p.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular font-mono">#{p.order}</span>
            {isNext && <span className="font-medium text-primary">Up next</span>}
            {prog?.needsDetails ? (
              <span className="text-warning">needs rating</span>
            ) : (
              prog?.confidence && <span className={cn(prog.confidence === "struggled" && "text-warning")}>{prog.confidence}</span>
            )}
            {prog?.source === "leetcode" && (
              <span className="inline-flex items-center gap-1 text-primary" title="Imported from LeetCode">
                <RefreshCw className="size-3" aria-hidden /> synced
              </span>
            )}
            {prog?.lastSolvedOn && <span className="hidden sm:inline">{formatDate(prog.lastSolvedOn, { day: "numeric", month: "short" })}</span>}
          </span>
        </span>
        <DifficultyBadge difficulty={p.difficulty} />
      </Link>
      {video && (
        <a
          href={video}
          target="_blank"
          rel="noreferrer"
          aria-label={`Watch the ${p.title} walkthrough on YouTube`}
          title="Video walkthrough"
          className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PlayCircle className="size-4" />
        </a>
      )}
      <a
        href={p.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${p.title} on LeetCode`}
        title="Open on LeetCode"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ExternalLink className="size-4" />
      </a>
    </li>
  );
}

export interface ProblemGroup {
  key: string;
  label: string;
  prefix?: string;
  items: ContentProblem[];
}

/** One accordion per section; the open keys of every section live in a single controlled array. */
export function ProblemGroups({
  title,
  groups,
  progress,
  open,
  onOpenChange,
  nextSlug,
  videos,
}: {
  title?: string;
  groups: ProblemGroup[];
  progress: Record<string, ProgressSummary>;
  open: string[];
  onOpenChange: (open: string[]) => void;
  nextSlug?: string;
  videos?: Record<string, string>;
}) {
  if (groups.length === 0) return null;
  const keys = new Set(groups.map((g) => g.key));
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const solved = groups.reduce((n, g) => n + g.items.filter((p) => progress[p.slug]?.status === "solved").length, 0);

  return (
    <section className="space-y-2">
      {title && (
        <SectionHeading
          eyebrow
          className="mb-0"
          title={title}
          hint={
            <span className="tabular font-mono">
              {solved} / {total} solved
            </span>
          }
        />
      )}
      <Accordion
        type="multiple"
        className="rounded-xl border bg-card"
        value={open.filter((k) => keys.has(k))}
        onValueChange={(v) => onOpenChange([...open.filter((k) => !keys.has(k)), ...v])}
      >
        {groups.map((g) => {
          const done = g.items.filter((p) => progress[p.slug]?.status === "solved").length;
          const complete = done === g.items.length;
          return (
            <AccordionItem key={g.key} value={g.key} className="px-3 sm:px-4">
              <AccordionTrigger className="min-h-12 items-center hover:no-underline">
                <span className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                  {g.prefix && <span className="hidden w-20 shrink-0 font-mono text-xs text-muted-foreground sm:inline">{g.prefix}</span>}
                  <span className="min-w-0 flex-1 truncate text-left">{g.label}</span>
                  {complete && <CheckCircle2 className="size-4 shrink-0 text-success" role="img" aria-label="All solved" />}
                  <Progress value={(done / g.items.length) * 100} className="w-12 shrink-0 sm:w-24" aria-hidden />
                  <span className="tabular w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {done}/{g.items.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2 [&_a]:no-underline">
                <ul className="-mx-1 space-y-0.5">
                  {g.items.map((p) => (
                    <ProblemRow key={p.slug} p={p} prog={progress[p.slug]} isNext={p.slug === nextSlug} video={videos?.[p.slug]} />
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
