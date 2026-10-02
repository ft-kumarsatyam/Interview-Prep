"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, PenLine, Search, SearchX, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CaseCardData } from "./case-overview";
import { StatusBadge } from "./case-status";

type StatusFilter = "all" | "todo" | "progress" | "mastered";
type LevelFilter = "all" | "core" | "advanced";

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "todo", label: "Not started" },
  { id: "progress", label: "In progress" },
  { id: "mastered", label: "Mastered" },
];

const LEVEL_FILTERS: Array<{ id: LevelFilter; label: string }> = [
  { id: "all", label: "Any level" },
  { id: "core", label: "Core" },
  { id: "advanced", label: "Advanced" },
];

function matchesStatus(c: CaseCardData, f: StatusFilter): boolean {
  if (f === "all") return true;
  if (f === "todo") return c.status === "new";
  if (f === "mastered") return c.status === "mastered";
  return c.status === "studying" || c.status === "practised";
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CaseBrowser({ cases, categories }: { cases: CaseCardData[]; categories?: readonly string[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return cases.filter(
      (c) =>
        matchesStatus(c, status) &&
        (level === "all" || c.level === level) &&
        (!q || c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q))),
    );
  }, [cases, deferredQuery, status, level]);

  const statusCount = (f: StatusFilter) => cases.filter((c) => matchesStatus(c, f)).length;
  const filtered = query.trim() !== "" || status !== "all" || level !== "all";
  const groups = categories
    ? categories.map((cat) => ({ name: cat, items: visible.filter((c) => c.category === cat) })).filter((g) => g.items.length > 0)
    : [{ name: null, items: visible }];

  function clear() {
    setQuery("");
    setStatus("all");
    setLevel("all");
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, e.g. cache, feed, sharding"
            aria-label="Search cases"
            className="h-10 pl-9"
          />
        </div>
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          <div role="group" aria-label="Filter by status" className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <Chip key={f.id} active={status === f.id} onClick={() => setStatus(f.id)}>
                {f.label}
                <span className="font-mono text-xs tabular opacity-70">{statusCount(f.id)}</span>
              </Chip>
            ))}
          </div>
          <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
          <div role="group" aria-label="Filter by level" className="flex gap-2">
            {LEVEL_FILTERS.map((f) => (
              <Chip key={f.id} active={level === f.id} onClick={() => setLevel(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex min-h-7 items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite">
          <span>
            Showing <span className="font-mono tabular text-foreground">{visible.length}</span> of {cases.length}
          </span>
          {filtered && (
            <Button size="sm" variant="ghost" onClick={clear}>
              <X /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No cases match"
          compact
          action={
            <Button size="sm" variant="outline" onClick={clear}>
              Clear filters
            </Button>
          }
        >
          Try a broader search or another status.
        </EmptyState>
      ) : (
        groups.map((g) => (
          <div key={g.name ?? "all"} role={g.name ? "group" : undefined} aria-label={g.name ?? undefined} className="space-y-2.5">
            {g.name && (
              <h3 className="flex items-baseline gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {g.name}
                <span className="font-normal tracking-normal normal-case">({g.items.length})</span>
              </h3>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((c) => (
                <li key={c.slug} className="min-w-0">
                  <CaseCard c={c} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function CaseCard({ c }: { c: CaseCardData }) {
  const pct = c.sectionsTotal ? Math.round((c.sectionsAttempted / c.sectionsTotal) * 100) : 0;
  return (
    <Link
      href={c.href}
      className={cn(
        "group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 ring-1 ring-white/5 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        c.status === "mastered" && "border-success/30",
      )}
    >
      <div className="flex items-center gap-2">
        <StatusBadge status={c.status} />
        <span className="text-xs text-muted-foreground capitalize">{c.level}</span>
        <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
      </div>
      <h4 className="leading-snug font-medium text-balance group-hover:text-primary">{c.title}</h4>
      <p className="line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
      <div className="mt-auto space-y-2 pt-2">
        {c.sectionsAttempted > 0 && (
          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Syllabus subtopics checked for this case's topic">
            <BookOpen className="size-3" aria-hidden /> {c.subtopicsDone}/{c.subtopicsTotal} subtopics
          </span>
          <span className="inline-flex items-center gap-1">
            <PenLine className="size-3" aria-hidden /> {c.sectionsAttempted}/{c.sectionsTotal} written
          </span>
          {c.minutesSpent > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden /> {c.minutesSpent} min
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
