"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentProblem } from "@/lib/content";
import type { ProgressSummary } from "@/lib/services/problems";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, filtersToQuery, isSolved, nextUnsolved, SORTS, STATUSES, TRACKS, VIEWS, type DsaFilters } from "./dsa-filters";
import { ProblemGroups, ProblemRow, type ProblemGroup } from "./problem-row";
import { patternGroups, stepGroups } from "./step-sheet";

const DIFFICULTY_LABEL: Record<DsaFilters["difficulty"], string> = { all: "All", Easy: "Easy", Medium: "Medium", Hard: "Hard" };
const STATUS_LABEL: Record<DsaFilters["status"], string> = { all: "All", todo: "To do", solved: "Solved", struggled: "Struggled" };
const SORT_LABEL: Record<DsaFilters["sort"], string> = { order: "Plan order", recent: "Recently solved" };
const VIEW_LABEL: Record<DsaFilters["view"], string> = { pattern: "By pattern", sheet: "Step sheet" };

interface Section {
  id: string;
  title?: string;
  groups: ProblemGroup[];
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function DsaBrowser({ problems, progress, initial }: { problems: ContentProblem[]; progress: Record<string, ProgressSummary>; initial: DsaFilters }) {
  const [filters, setFilters] = useState<DsaFilters>(initial);
  /** null = automatic: everything open while filtering, otherwise just the group holding the next problem. */
  const [open, setOpen] = useState<string[] | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const query = useDeferredValue(filters.q);

  // Debounced: Safari throws if replaceState is called too often while typing.
  useEffect(() => {
    const id = setTimeout(() => {
      const qs = filtersToQuery(filters);
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }, 250);
    return () => clearTimeout(id);
  }, [filters]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const update = (patch: Partial<DsaFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setOpen(null);
  };
  const clearAll = () => update({ q: "", difficulty: "all", status: "all", pattern: "", sort: "order" });

  const track = TRACKS.find((t) => t.id === filters.track) ?? TRACKS[0];
  const trackProblems = useMemo(() => problems.filter((p) => p.track === filters.track), [problems, filters.track]);
  const patterns = useMemo(() => [...new Set(trackProblems.map((p) => p.pattern))], [trackProblems]);
  const pattern = patterns.includes(filters.pattern) ? filters.pattern : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return trackProblems.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.pattern.toLowerCase().includes(q) && String(p.leetcodeId) !== q) return false;
      if (filters.difficulty !== "all" && p.difficulty !== filters.difficulty) return false;
      if (pattern && p.pattern !== pattern) return false;
      const prog = progress[p.slug];
      if (filters.status === "todo" && isSolved(prog)) return false;
      if (filters.status === "solved" && !isSolved(prog)) return false;
      if (filters.status === "struggled" && prog?.confidence !== "struggled") return false;
      return true;
    });
  }, [trackProblems, progress, query, filters.difficulty, filters.status, pattern]);

  const filtersActive = query.trim() !== "" || filters.difficulty !== "all" || filters.status !== "all" || pattern !== "";
  const refineCount = [filters.difficulty !== "all", filters.status !== "all", pattern !== "", filters.sort !== "order"].filter(Boolean).length;
  const next = nextUnsolved(problems, progress, filters.track);
  const byRecent = filters.sort === "recent";

  const sections = useMemo<Section[]>(() => {
    if (filters.track === "main" && filters.view === "sheet") return [{ id: "sheet", groups: stepGroups(filtered) }];
    if (filters.track !== "main") return [{ id: "all", groups: patternGroups(filtered, filters.track) }];
    return (["core", "extended"] as const).map((tier) => ({
      id: tier,
      title: tier === "core" ? "Pass 1 · Core" : "Pass 2 · Extended",
      groups: patternGroups(
        filtered.filter((p) => p.tier === tier),
        tier,
      ),
    }));
  }, [filtered, filters.track, filters.view]);

  const recent = useMemo(
    () =>
      byRecent
        ? filtered.toSorted((a, b) => (progress[b.slug]?.lastSolvedOn ?? "").localeCompare(progress[a.slug]?.lastSolvedOn ?? "") || a.order - b.order)
        : [],
    [byRecent, filtered, progress],
  );

  const groups = sections.flatMap((s) => s.groups);
  const allKeys = groups.map((g) => g.key);
  const nextKey = next ? groups.find((g) => g.items.some((p) => p.slug === next.slug))?.key : undefined;
  const openKeys = open ?? (filtersActive ? allKeys : nextKey ? [nextKey] : []);
  const allOpen = allKeys.length > 0 && allKeys.every((k) => openKeys.includes(k));

  const chips: Array<{ label: string; clear: () => void }> = [
    ...(filters.difficulty !== "all" ? [{ label: filters.difficulty, clear: () => update({ difficulty: "all" }) }] : []),
    ...(filters.status !== "all" ? [{ label: STATUS_LABEL[filters.status], clear: () => update({ status: "all" }) }] : []),
    ...(pattern ? [{ label: pattern, clear: () => update({ pattern: "" }) }] : []),
    ...(byRecent ? [{ label: SORT_LABEL.recent, clear: () => update({ sort: "order" }) }] : []),
  ];

  const filterControls = {
    filters,
    patterns,
    pattern,
    update,
    showView: filters.track === "main",
  };

  return (
    <Tabs
      value={filters.track}
      onValueChange={(v) => {
        const t = TRACKS.find((x) => x.id === v);
        if (t) update({ track: t.id, pattern: "" });
      }}
      className="gap-3"
    >
      <TabsList className="w-full group-data-horizontal/tabs:h-10 sm:w-fit">
        {TRACKS.map((t) => {
          const list = problems.filter((p) => p.track === t.id);
          const solved = list.filter((p) => isSolved(progress[p.slug])).length;
          return (
            <TabsTrigger key={t.id} value={t.id} className="px-3">
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="tabular font-mono text-xs text-muted-foreground">
                {solved}/{list.length}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value={filters.track} className="space-y-3">
        <p className="text-sm text-pretty text-muted-foreground">{track.blurb}</p>

        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && filters.q) {
                    e.preventDefault();
                    update({ q: "" });
                  }
                }}
                enterKeyHint="search"
                placeholder="Search title, pattern or LC #"
                className="h-10 pr-10 pl-9"
                aria-label="Search problems"
              />
              {filters.q ? (
                <button
                  type="button"
                  onClick={() => {
                    update({ q: "" });
                    searchRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-2xs text-muted-foreground md:block">/</kbd>
              )}
            </div>
            <DesktopFilters {...filterControls} />
            <MobileFilters {...filterControls} count={refineCount} matching={filtered.length} clearAll={clearAll} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span>
              <span className="tabular font-medium text-foreground">{filtered.length}</span> of {trackProblems.length}
            </span>
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.clear}
                className="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border bg-muted/50 pr-1.5 pl-2.5 text-xs text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Remove filter: ${c.label}`}
              >
                <span className="truncate">{c.label}</span>
                <X className="size-3 shrink-0" aria-hidden />
              </button>
            ))}
            {(filtersActive || byRecent) && (
              <Button variant="link" size="sm" className="h-7 px-1" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>
          {!byRecent && filtered.length > 0 && (
            <div className="flex items-center gap-1">
              {filters.track === "main" && (
                <Segmented label="View" value={filters.view} options={VIEWS} labels={VIEW_LABEL} onChange={(view) => update({ view })} className="hidden sm:flex" />
              )}
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setOpen(allOpen ? [] : allKeys)} aria-label={allOpen ? "Collapse all groups" : "Expand all groups"}>
                {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
                <span className="hidden sm:inline">{allOpen ? "Collapse all" : "Expand all"}</span>
              </Button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon={SearchX}
            title="No problems match"
            action={
              <Button variant="outline" size="lg" onClick={clearAll}>
                Clear filters
              </Button>
            }
          >
            Try a different search, or widen the difficulty, status or pattern.
          </EmptyState>
        ) : byRecent ? (
          <ul className="space-y-0.5 rounded-xl border bg-card p-1.5 sm:p-2">
            {recent.map((p) => (
              <ProblemRow key={p.slug} p={p} prog={progress[p.slug]} isNext={p.slug === next?.slug} />
            ))}
          </ul>
        ) : (
          <div className="space-y-6">
            {sections.map((s) => (
              <ProblemGroups
                key={s.id}
                title={s.title}
                groups={s.groups}
                progress={progress}
                open={openKeys}
                onOpenChange={setOpen}
                nextSlug={next?.slug}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

interface FilterControls {
  filters: DsaFilters;
  patterns: string[];
  pattern: string;
  update: (patch: Partial<DsaFilters>) => void;
  showView: boolean;
}

function DesktopFilters({ filters, patterns, pattern, update }: FilterControls) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <FilterMenu label="Difficulty" value={filters.difficulty} options={DIFFICULTIES} labels={DIFFICULTY_LABEL} onChange={(difficulty) => update({ difficulty })} />
      <FilterMenu label="Status" value={filters.status} options={STATUSES} labels={STATUS_LABEL} onChange={(status) => update({ status })} />
      {patterns.length > 1 && (
        <FilterMenu
          label="Pattern"
          value={pattern || "all"}
          options={["all", ...patterns]}
          labels={{ all: "All patterns" }}
          onChange={(p) => update({ pattern: p === "all" ? "" : p })}
        />
      )}
      <FilterMenu label="Sort" value={filters.sort} options={SORTS} labels={SORT_LABEL} defaultValue="order" onChange={(sort) => update({ sort })} />
    </div>
  );
}

function FilterMenu<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  defaultValue = "all" as T,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Partial<Record<T, string>>;
  onChange: (v: T) => void;
  defaultValue?: T;
}) {
  const active = value !== defaultValue;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-10 max-w-44 gap-1.5", active && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15")}>
          <span className="truncate">{active ? (labels[value] ?? value) : label}</span>
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-44 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(options.find((o) => o === v) ?? defaultValue)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o}>
              {labels[o] ?? o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileFilters({
  filters,
  patterns,
  pattern,
  update,
  showView,
  count,
  matching,
  clearAll,
}: FilterControls & { count: number; matching: number; clearAll: () => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("h-10 md:hidden", count > 0 && "border-primary/50 text-primary")} aria-label={count > 0 ? `Filters, ${count} active` : "Filters"}>
          <SlidersHorizontal />
          <span className="hidden min-[400px]:inline">Filters</span>
          {count > 0 && <span className="tabular grid size-5 place-items-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Filter problems</SheetTitle>
          <SheetDescription>
            <span className="tabular">{matching}</span> match right now.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-1">
          <Field label="Difficulty">
            <Segmented label="Difficulty" value={filters.difficulty} options={DIFFICULTIES} labels={DIFFICULTY_LABEL} onChange={(difficulty) => update({ difficulty })} full />
          </Field>
          <Field label="Status">
            <Segmented label="Status" value={filters.status} options={STATUSES} labels={STATUS_LABEL} onChange={(status) => update({ status })} full />
          </Field>
          <Field label="Sort">
            <Segmented label="Sort" value={filters.sort} options={SORTS} labels={SORT_LABEL} onChange={(sort) => update({ sort })} full />
          </Field>
          {showView && (
            <Field label="View">
              <Segmented label="View" value={filters.view} options={VIEWS} labels={VIEW_LABEL} onChange={(view) => update({ view })} full />
            </Field>
          )}
          {patterns.length > 1 && (
            <Field label="Pattern">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pattern">
                {["", ...patterns].map((p) => (
                  <Chip key={p || "all"} pressed={pattern === p} onClick={() => update({ pattern: p })} className="shrink-0 text-xs">
                    {p || "All patterns"}
                  </Chip>
                ))}
              </div>
            </Field>
          )}
        </div>
        <SheetFooter className="flex-row border-t">
          <Button variant="outline" className="h-10 flex-1" onClick={clearAll} disabled={count === 0 && !filters.q}>
            Reset
          </Button>
          <SheetClose asChild>
            <Button className="h-10 flex-1">Show {matching}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  labels,
  full,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 rounded-lg border p-0.5", full && "w-full", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2.5 text-xs whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            full ? "h-9 flex-1" : "h-7",
            value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

