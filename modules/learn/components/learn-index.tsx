"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarClock, Check, ChevronRight, Search, SearchX, X } from "lucide-react";
import { LinkCard } from "@/components/shared/link-card";
import { StatusRing } from "@/modules/learn/components/topic-meta";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackChip } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { ContentTrack } from "@/core/content";
import { searchTopics, topicIdFromHash, trackTopics, type TopicStatus } from "@/modules/learn/domain/learn";
import { cn } from "@/core/utils";

export interface TopicRow {
  id: string;
  track: string;
  week: number;
  level: number;
  title: string;
  subtopics: string[];
  done: number;
  total: number;
  status: TopicStatus;
  mastered: boolean;
  nextTitle: string | null;
}

export interface ContinueCard {
  topicId: string;
  reason: "recent" | "this-week" | "next";
}

type Filter = "all" | TopicStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "progress", label: "In progress" },
  { id: "todo", label: "Not started" },
  { id: "done", label: "Done" },
];

const REASON_LABEL: Record<ContinueCard["reason"], string> = {
  recent: "Continue where you left off",
  "this-week": "This week's topic",
  next: "Up next",
};

const pctOf = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

export function LearnIndex({
  tracks,
  rows,
  continueCard,
  currentWeek,
  initialTrack,
}: {
  tracks: ContentTrack[];
  rows: TopicRow[];
  continueCard: ContinueCard | null;
  currentWeek: number;
  initialTrack: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The live URL wins over the prop: going back re-renders from the router cache with the first visit's props.
  const [track, setTrack] = useState(() => {
    const fromUrl = searchParams.get("track");
    return fromUrl && tracks.some((t) => t.id === fromUrl) ? fromUrl : initialTrack;
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  // Old links (/learn?track=x#topic-<id>) now open the topic page.
  useEffect(() => {
    const id = topicIdFromHash(window.location.hash);
    if (id && rowById.has(id)) router.replace(`/learn/${encodeURIComponent(id)}`);
  }, [rowById, router]);

  useEffect(() => {
    chipsRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
  }, [track]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totals = useMemo(() => {
    const out = new Map<string, { done: number; total: number; mastered: number; topics: number }>();
    for (const t of tracks) out.set(t.id, { done: 0, total: 0, mastered: 0, topics: 0 });
    for (const r of rows) {
      const tot = out.get(r.track);
      if (!tot) continue;
      tot.done += r.done;
      tot.total += r.total;
      tot.topics += 1;
      if (r.mastered) tot.mastered += 1;
    }
    return out;
  }, [tracks, rows]);

  function changeTrack(id: string) {
    setTrack(id);
    const url = new URL(window.location.href);
    url.searchParams.set("track", id);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  const searching = query.trim().length > 0;
  const matches = useMemo(() => searchTopics(rows, query), [rows, query]);
  const inTrack = trackTopics(rows, track);
  const counts: Record<Filter, number> = {
    all: inTrack.length,
    todo: inTrack.filter((r) => r.status === "todo").length,
    progress: inTrack.filter((r) => r.status === "progress").length,
    done: inTrack.filter((r) => r.status === "done").length,
  };
  const visible = inTrack.filter((r) => filter === "all" || r.status === filter);
  const activeTrack = trackById.get(track);
  const tot = totals.get(track) ?? { done: 0, total: 0, mastered: 0, topics: 0 };
  const cont = continueCard ? rowById.get(continueCard.topicId) : undefined;

  return (
    <div className="space-y-4">
      {cont && continueCard && <ContinueBanner row={cont} reason={continueCard.reason} track={trackById.get(cont.track)} />}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every topic and subtopic"
          aria-label="Search every topic and subtopic"
          className="h-11 pr-10 pl-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-2xs text-muted-foreground sm:block">/</kbd>
        )}
      </div>

      {searching ? (
        <section aria-label="Search results" className="space-y-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {matches.length} topic{matches.length === 1 ? "" : "s"} across all tracks
          </p>
          {matches.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              compact
              action={
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            >
              Try a shorter word, such as &quot;event loop&quot; or &quot;index&quot;.
            </EmptyState>
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {matches.map(({ topic, subtopics }) => (
                  <li key={topic.id}>
                    <TopicLink
                      row={topic}
                      track={trackById.get(topic.track)}
                      current={topic.week === currentWeek}
                      showTrack
                      snippet={subtopics.slice(0, 2).map((i) => topic.subtopics[i]!)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      ) : (
        <>
          <div ref={chipsRef} role="radiogroup" aria-label="Tracks" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {tracks.map((t) => {
              const tt = totals.get(t.id);
              const pct = tt ? pctOf(tt.done, tt.total) : 0;
              const selected = t.id === track;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => changeTrack(t.id)}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t.name}
                  <span className={cn("tabular font-mono text-2xs", pct === 100 ? "text-success" : "opacity-70")}>
                    {pct === 100 ? <Check className="inline size-3.5" aria-label="complete" /> : `${pct}%`}
                  </span>
                </button>
              );
            })}
          </div>

          <Card className="gap-0 py-0">
            <CardContent className="space-y-3 border-b px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-semibold">{activeTrack?.name}</h2>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular font-mono">
                    {tot.done}/{tot.total}
                  </span>{" "}
                  subtopics ·{" "}
                  <span className="tabular font-mono">
                    {tot.mastered}/{tot.topics}
                  </span>{" "}
                  mastered
                </p>
              </div>
              <Progress value={pctOf(tot.done, tot.total)} aria-label={`${activeTrack?.name ?? "Track"} progress`} className="h-1.5" />
              <div role="radiogroup" aria-label="Filter topics" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      filter === f.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {f.label}
                    <span className="tabular font-mono text-2xs opacity-70">{counts[f.id]}</span>
                  </button>
                ))}
              </div>
            </CardContent>
            {visible.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={SearchX}
                  title={inTrack.length === 0 ? "No topics in this track yet" : "No topics with this status"}
                  compact
                  action={
                    inTrack.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                        Show all
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <ul className="divide-y">
                {visible.map((r) => (
                  <li key={r.id}>
                    <TopicLink row={r} track={activeTrack} current={r.week === currentWeek} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function ContinueBanner({ row, reason, track }: { row: TopicRow; reason: ContinueCard["reason"]; track: ContentTrack | undefined }) {
  const pct = pctOf(row.done, row.total);
  return (
    <LinkCard href={`/learn/${encodeURIComponent(row.id)}`} className="block p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5 text-primary" aria-hidden />
        <span className="font-medium text-primary">{REASON_LABEL[reason]}</span>
        {track && <TrackChip color={track.color}>{track.name}</TrackChip>}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold sm:text-lg">{row.title}</p>
          {row.nextTitle && <p className="truncate text-sm text-muted-foreground">Next: {row.nextTitle}</p>}
        </div>
        <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          {row.done > 0 ? "Continue" : "Start"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={pct} aria-label={`${row.title} progress`} className="h-1.5" />
        <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
          {row.done}/{row.total}
        </span>
      </div>
    </LinkCard>
  );
}

function TopicLink({
  row,
  track,
  current,
  showTrack,
  snippet,
}: {
  row: TopicRow;
  track: ContentTrack | undefined;
  current: boolean;
  showTrack?: boolean;
  snippet?: string[];
}) {
  const detail =
    row.status === "done" ? (row.mastered ? "Mastered" : "All subtopics ticked, quiz ready") : row.nextTitle ? `Next: ${row.nextTitle}` : null;
  return (
    <Link
      href={`/learn/${encodeURIComponent(row.id)}`}
      className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      <StatusRing done={row.done} total={row.total} status={row.status} mastered={row.mastered} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{row.title}</span>
          {current && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-2xs font-medium text-primary">This week</span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {showTrack && track && <TrackChip color={track.color} className="px-1.5 py-0 text-2xs">{track.name}</TrackChip>}
          <span className="shrink-0">Week {row.week}</span>
          {detail && (
            <>
              <span aria-hidden>·</span>
              <span className={cn("truncate", row.status === "done" && "text-success")}>{detail}</span>
            </>
          )}
        </span>
        {snippet && snippet.length > 0 && (
          <span className="mt-1 block space-y-0.5">
            {snippet.map((s) => (
              <span key={s} className="block truncate text-xs text-foreground/80">
                ↳ {s}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="tabular hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
        {row.done}/{row.total}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
    </Link>
  );
}
