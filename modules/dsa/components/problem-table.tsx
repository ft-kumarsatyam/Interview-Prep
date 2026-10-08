"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, CircleCheck, CircleDashed, ExternalLink, FileText, Filter, PlayCircle, Search, SearchX, Shuffle, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { replaceQuery } from "@/components/shared/history-back-link";
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
import { cn } from "@/core/utils";
import { setBookmarkAction } from "@/app/(app)/dsa/actions";
import { LevelBadge } from "@/modules/dsa/components/dsa-progress-card";
import {
  DEFAULT_TABLE_FILTERS,
  filterRows,
  LEVELS,
  pinFirst,
  sortRows,
  tableFiltersToPatch,
  type PracticeRow,
  type TableFilters,
  type TableSort,
  type TableStatus,
} from "@/modules/dsa/domain/practice-table";

const PAGE = 30;
const SORT_LABEL: Record<TableSort, string> = { order: "Default order", frequency: "Asked frequency", companies: "Most companies", shuffle: "Shuffled" };
const STATUS_LABEL: Record<TableStatus, string> = { all: "All", todo: "To do", solved: "Solved", bookmarked: "Bookmarked" };

function StatusIcon({ status }: { status: "solved" | "attempted" | "todo" }) {
  if (status === "solved") return <CircleCheck className="size-4 shrink-0 text-success" aria-label="Solved" />;
  if (status === "attempted") return <CircleDashed className="size-4 shrink-0 text-warning" aria-label="Attempted" />;
  return <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" aria-label="Not started" />;
}

function Companies({ row, onPick }: { row: PracticeRow; onPick: (company: string) => void }) {
  if (row.companyCount === 0) return <span className="text-xs text-muted-foreground">-</span>;
  const shown = row.companies.slice(0, 2);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((c) => (
        <button key={c} type="button" onClick={() => onPick(c)} className="rounded-md border px-1.5 py-0.5 text-xs hover:bg-muted" title={`Filter by ${c}`}>
          {c}
        </button>
      ))}
      {row.companyCount > shown.length && <span className="text-xs text-muted-foreground" title={row.companies.join(", ")}>+{row.companyCount - shown.length}</span>}
    </span>
  );
}

function Topics({ row, onPick }: { row: PracticeRow; onPick: (topic: string) => void }) {
  const [first, ...rest] = row.topics;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {first && (
        <button type="button" onClick={() => onPick(first)} className="max-w-40 truncate rounded-md bg-muted px-1.5 py-0.5 text-xs hover:text-foreground" title={`Filter by ${first}`}>
          {first}
        </button>
      )}
      {rest.length > 0 && <span className="text-xs text-muted-foreground" title={rest.join(", ")}>+{rest.length} more</span>}
    </span>
  );
}

function Resources({ row }: { row: PracticeRow }) {
  const link = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <span className="flex items-center gap-0.5">
      {row.url && (
        <a href={row.url} target="_blank" rel="noreferrer" className={link} aria-label={`${row.title} on LeetCode`} title="LeetCode">
          <ExternalLink className="size-3.5" />
        </a>
      )}
      {row.video && (
        <a href={row.video} target="_blank" rel="noreferrer" className={link} aria-label={`${row.title} video`} title="Video">
          <PlayCircle className="size-3.5" />
        </a>
      )}
      {row.article && (
        <a href={row.article} target="_blank" rel="noreferrer" className={link} aria-label={`${row.title} article`} title="Article">
          <FileText className="size-3.5" />
        </a>
      )}
    </span>
  );
}

export function ProblemTable({
  rows,
  solved,
  attempted,
  bookmarks: initialBookmarks,
  potdSlug,
  initial = DEFAULT_TABLE_FILTERS,
  topics,
  companies,
}: {
  rows: PracticeRow[];
  solved: string[];
  attempted: string[];
  bookmarks: string[];
  potdSlug?: string | null;
  initial?: TableFilters;
  topics: string[];
  companies: string[];
}) {
  const [filters, setFilters] = useState<TableFilters>(initial);
  const [seed, setSeed] = useState(1);
  const [limit, setLimit] = useState(PAGE);
  const [bookmarks, setBookmarks] = useState(() => new Set(initialBookmarks));
  const [, startSaving] = useTransition();
  const q = useDeferredValue(filters.q);
  const solvedSet = useMemo(() => new Set(solved), [solved]);
  const attemptedSet = useMemo(() => new Set(attempted), [attempted]);

  useEffect(() => {
    const id = setTimeout(() => replaceQuery(tableFiltersToPatch(filters)), 250);
    return () => clearTimeout(id);
  }, [filters]);

  const update = (patch: Partial<TableFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };

  const visible = useMemo(() => {
    const filtered = filterRows(rows, { ...filters, q }, { solved: solvedSet, bookmarks });
    const sorted = sortRows(filtered, filters.sort, seed);
    const isDefaultView = filters.sort === "order" && !q && filters.level === "all" && filters.status === "all" && !filters.company && !filters.topic;
    return isDefaultView ? pinFirst(sorted, potdSlug) : sorted;
  }, [rows, filters, q, solvedSet, bookmarks, seed, potdSlug]);

  const toggleBookmark = (slug: string) => {
    const on = !bookmarks.has(slug);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });
    startSaving(async () => {
      const result = await setBookmarkAction({ slug, on });
      if (result.ok) return;
      toast.error(result.error);
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (on) next.delete(slug);
        else next.add(slug);
        return next;
      });
    });
  };

  const activeFilters = [
    filters.level !== "all" && { key: "level", label: filters.level, clear: () => update({ level: "all" }) },
    filters.status !== "all" && { key: "status", label: STATUS_LABEL[filters.status], clear: () => update({ status: "all" }) },
    filters.company && { key: "company", label: filters.company, clear: () => update({ company: "" }) },
    filters.topic && { key: "topic", label: filters.topic, clear: () => update({ topic: "" }) },
  ].filter((f): f is { key: string; label: string; clear: () => void } => Boolean(f));

  const shown = visible.slice(0, limit);

  return (
    <section aria-label="DSA problems" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search problems" className="pl-9" aria-label="Search problems" />
        </div>
        <span className="tabular ml-auto text-sm text-muted-foreground">{visible.length.toLocaleString()} problems</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Filter problems" className={cn(activeFilters.length > 0 && "border-primary/40 text-primary")}>
              <Filter />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
            <DropdownMenuLabel>Level</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filters.level} onValueChange={(v) => update({ level: v as TableFilters["level"] })}>
              {(["all", ...LEVELS] as const).map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>{l === "all" ? "All levels" : l}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filters.status} onValueChange={(v) => update({ status: v as TableStatus })}>
              {(Object.keys(STATUS_LABEL) as TableStatus[]).map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>{STATUS_LABEL[s]}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sort</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filters.sort} onValueChange={(v) => update({ sort: v as TableSort })}>
              {(Object.keys(SORT_LABEL) as TableSort[]).map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>{SORT_LABEL[s]}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Company</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filters.company} onValueChange={(v) => update({ company: v })}>
              <DropdownMenuRadioItem value="">Any company</DropdownMenuRadioItem>
              {companies.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>{c}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Topic</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filters.topic} onValueChange={(v) => update({ topic: v })}>
              <DropdownMenuRadioItem value="">Any topic</DropdownMenuRadioItem>
              {topics.map((t) => (
                <DropdownMenuRadioItem key={t} value={t}>{t}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="icon"
          aria-label="Shuffle problems"
          title="Shuffle"
          onClick={() => {
            setSeed(Math.floor(Math.random() * 1_000_000) + 1);
            update({ sort: "shuffle" });
          }}
        >
          <Shuffle />
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeFilters.map((f) => (
            <button key={f.key} type="button" onClick={f.clear} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {f.label} <X className="size-3" aria-label={`Clear ${f.label}`} />
            </button>
          ))}
          <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => update({ level: "all", status: "all", company: "", topic: "" })}>
            Clear all
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState compact title="Nothing matches" icon={SearchX}>Try another search or clear a filter.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Problem</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Difficulty</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Companies</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Topics</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Resources</th>
                  <th scope="col" className="px-3 py-2.5"><span className="sr-only">Bookmark</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((row) => {
                  const marked = bookmarks.has(row.slug);
                  const status = solvedSet.has(row.slug) ? "solved" : attemptedSet.has(row.slug) ? "attempted" : "todo";
                  return (
                    <tr key={row.slug} className={cn("hover:bg-muted/40", row.slug === potdSlug && "bg-primary/5")}>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <StatusIcon status={status} />
                          <Link href={`/dsa/${row.slug}`} className="font-medium hover:text-primary">
                            <span className="tabular text-muted-foreground">{row.number}.</span> {row.title}
                          </Link>
                          {row.slug === potdSlug && <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary">POTD</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><LevelBadge level={row.level} /></td>
                      <td className="px-3 py-2.5"><Companies row={row} onPick={(company) => update({ company })} /></td>
                      <td className="px-3 py-2.5"><Topics row={row} onPick={(topic) => update({ topic })} /></td>
                      <td className="px-3 py-2.5"><Resources row={row} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="icon" aria-pressed={marked} aria-label={marked ? `Remove bookmark from ${row.title}` : `Bookmark ${row.title}`} onClick={() => toggleBookmark(row.slug)}>
                          {marked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {shown.map((row) => {
              const marked = bookmarks.has(row.slug);
              const status = solvedSet.has(row.slug) ? "solved" : attemptedSet.has(row.slug) ? "attempted" : "todo";
              return (
                <li key={row.slug} className={cn("rounded-xl border bg-card p-3", row.slug === potdSlug && "border-primary/40")}>
                  <div className="flex items-start gap-2">
                    <StatusIcon status={status} />
                    <Link href={`/dsa/${row.slug}`} className="min-w-0 flex-1 font-medium">
                      <span className="tabular text-muted-foreground">{row.number}.</span> {row.title}
                    </Link>
                    <Button variant="ghost" size="icon" className="-mt-1.5 -mr-1.5" aria-pressed={marked} aria-label={marked ? `Remove bookmark from ${row.title}` : `Bookmark ${row.title}`} onClick={() => toggleBookmark(row.slug)}>
                      {marked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.slug === potdSlug && <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary">POTD</span>}
                    <LevelBadge level={row.level} />
                    <Topics row={row} onPick={(topic) => update({ topic })} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Companies row={row} onPick={(company) => update({ company })} />
                    <Resources row={row} />
                  </div>
                </li>
              );
            })}
          </ul>

          {visible.length > limit && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({visible.length - limit} left)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
