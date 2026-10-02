"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Award, CalendarClock, Check, ChevronDown, CircleDashed, ExternalLink, Lock, NotebookPen, Search, SearchX, Sparkles, X } from "lucide-react";
import { updateSubtopicNotes } from "@/app/(app)/dashboard/actions";
import { SubtopicChecklist } from "@/components/progress/subtopic-checklist";
import { EmptyState } from "@/components/shared/empty-state";
import { TrackChip } from "@/components/shared/badges";
import { MarkdownNotes } from "@/components/shared/markdown-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentTopic, ContentTrack } from "@/lib/content";
import type { SubtopicProgressSummary } from "@/lib/services/learn";
import { cn } from "@/lib/utils";

const LEVELS = ["", "Basics", "Intermediate", "Advanced", "Interview / Big-tech"];

const DESIGN_TEMPLATE = `## Requirements
- Functional:
- Non-functional (scale, latency, availability):

## Estimates
- QPS / storage / bandwidth:

## API

## Data model

## High-level design

## Deep dives

## Trade-offs`;

export interface MasteryView {
  score: number;
  bestPct: number;
  attempts: number;
  masteredOn: string | null;
}

type Status = "todo" | "progress" | "done";
type Filter = "all" | Status;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "progress", label: "In progress" },
  { id: "todo", label: "Not started" },
  { id: "done", label: "Done" },
];

interface TopicStats {
  done: number;
  total: number;
  status: Status;
  mastered: boolean;
}

const topicAnchor = (topicId: string) => `topic-${topicId}`;

function topicStats(topic: ContentTopic, progress: Record<string, SubtopicProgressSummary>, mastery: Record<string, MasteryView>): TopicStats {
  const total = topic.subtopics.length;
  const done = topic.subtopics.filter((_, i) => !!progress[`${topic.id}:${i}`]).length;
  const mastered = !!mastery[topic.id]?.masteredOn;
  const status: Status = done === total || mastered ? "done" : done > 0 ? "progress" : "todo";
  return { done, total, status, mastered };
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function LearnBrowser({
  tracks,
  topics,
  progress,
  mastery,
  currentWeek,
  initialTrack,
}: {
  tracks: ContentTrack[];
  topics: ContentTopic[];
  progress: Record<string, SubtopicProgressSummary>;
  mastery: Record<string, MasteryView>;
  currentWeek: number;
  initialTrack: string;
}) {
  const [track, setTrack] = useState(initialTrack);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [hashTopic, setHashTopic] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const byTrack = useMemo(() => {
    const map = new Map<string, Array<{ topic: ContentTopic; stats: TopicStats }>>();
    for (const t of tracks) map.set(t.id, []);
    for (const topic of topics) map.get(topic.track)?.push({ topic, stats: topicStats(topic, progress, mastery) });
    for (const list of map.values()) list.sort((a, b) => a.topic.week - b.topic.week);
    return map;
  }, [tracks, topics, progress, mastery]);

  const trackTotals = useMemo(() => {
    const out = new Map<string, { done: number; total: number; mastered: number; topics: number }>();
    for (const [id, list] of byTrack) {
      out.set(id, {
        done: list.reduce((s, x) => s + x.stats.done, 0),
        total: list.reduce((s, x) => s + x.stats.total, 0),
        mastered: list.filter((x) => x.stats.mastered).length,
        topics: list.length,
      });
    }
    return out;
  }, [byTrack]);

  // Deep links like /learn?track=node#topic-node-streams open and scroll to that topic; otherwise this week's topic.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const fromHash = hash.startsWith("topic-") ? hash.slice("topic-".length) : null;
    const hashed = fromHash ? topics.find((t) => t.id === fromHash) : undefined;
    const target = hashed ?? topics.find((t) => t.track === initialTrack && t.week === currentWeek);
    if (!target) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      if (hashed) {
        setHashTopic(hashed.id);
        if (hashed.track !== initialTrack) setTrack(hashed.track);
      }
      // Deferred so the newly selected tab / expanded card is laid out before measuring.
      timer = setTimeout(() => {
        const el = document.getElementById(topicAnchor(target.id));
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (hashed || rect.top > window.innerHeight * 0.75) el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }, 80);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [topics, initialTrack, currentWeek]);

  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
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

  function changeTrack(id: string) {
    setTrack(id);
    const url = new URL(window.location.href);
    url.searchParams.set("track", id);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }

  const q = query.trim().toLowerCase();

  return (
    <Tabs value={track} onValueChange={changeTrack} className="gap-4">
      <div ref={tabsRef} className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <TabsList aria-label="Tracks" className="h-auto w-max justify-start gap-1 group-data-horizontal/tabs:h-auto md:w-full md:flex-wrap">
          {tracks.map((t) => {
            const tot = trackTotals.get(t.id);
            const complete = !!tot && tot.total > 0 && tot.done === tot.total;
            return (
              <TabsTrigger key={t.id} value={t.id} className="h-9 flex-none gap-2 px-3">
                {t.name}
                {tot && tot.total > 0 && (
                  <span className={cn("tabular rounded-full px-1.5 font-mono text-[11px]", complete ? "bg-success/15 text-success" : "bg-muted-foreground/10 text-muted-foreground")}>
                    {complete ? <Check className="inline size-3" aria-label="complete" /> : `${Math.round((tot.done / tot.total) * 100)}%`}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {tracks.map((t) => {
        const list = byTrack.get(t.id) ?? [];
        const tot = trackTotals.get(t.id) ?? { done: 0, total: 0, mastered: 0, topics: 0 };
        const counts: Record<Filter, number> = {
          all: list.length,
          todo: list.filter((x) => x.stats.status === "todo").length,
          progress: list.filter((x) => x.stats.status === "progress").length,
          done: list.filter((x) => x.stats.status === "done").length,
        };
        const visible = list
          .map((x) => ({ ...x, matches: q ? x.topic.subtopics.map((s, i) => (s.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0) : [] }))
          .filter((x) => (filter === "all" || x.stats.status === filter) && (!q || x.topic.title.toLowerCase().includes(q) || x.matches.length > 0));
        const thisWeek = list.find((x) => x.topic.week === currentWeek);
        const nextUp = thisWeek && thisWeek.stats.status !== "done" ? thisWeek : (list.find((x) => x.stats.status === "progress") ?? list.find((x) => x.stats.status === "todo"));
        const pct = tot.total ? Math.round((tot.done / tot.total) * 100) : 0;

        return (
          <TabsContent key={t.id} value={t.id} className="space-y-4">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    <span className="tabular font-mono">{tot.done}/{tot.total}</span> subtopics ·{" "}
                    <span className="tabular font-mono">{tot.mastered}/{tot.topics}</span> topics mastered
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={pct} aria-label={`${t.name} progress`} className="h-2" />
                  <span className="tabular shrink-0 font-mono text-sm font-medium">{pct}%</span>
                </div>
                {nextUp ? (
                  <a
                    href={`#${topicAnchor(nextUp.topic.id)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setFilter("all");
                      setQuery("");
                      requestAnimationFrame(() =>
                        document.getElementById(topicAnchor(nextUp.topic.id))?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }),
                      );
                    }}
                    className="group flex min-h-11 items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground">
                        {nextUp === thisWeek ? "This week" : nextUp.stats.status === "progress" ? "Continue" : "Up next"} · Week {nextUp.topic.week}
                      </span>
                      <span className="block truncate font-medium">{nextUp.topic.title}</span>
                    </span>
                    <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                      {nextUp.stats.done}/{nextUp.stats.total}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </a>
                ) : (
                  tot.topics > 0 && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-success">
                      <Award className="size-4" aria-hidden /> Every topic in this track is done. Nice work.
                    </p>
                  )
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${t.name} topics`}
                  aria-label={`Search ${t.name} topics and subtopics`}
                  className="h-10 pr-9 pl-9"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">/</kbd>
                )}
              </div>
              <div role="radiogroup" aria-label="Filter topics" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      filter === f.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {f.label}
                    <span className="tabular font-mono text-[11px] opacity-70">{counts[f.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {visible.length} of {list.length} topics shown
            </p>

            {visible.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={list.length === 0 ? "No topics in this track yet" : "No topics match"}
                compact
                action={
                  list.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )
                }
              >
                {list.length > 0 && "Try another search term or switch the filter back to All."}
              </EmptyState>
            ) : (
              <div className="grid items-start gap-4 md:grid-cols-2">
                {visible.map(({ topic, stats, matches }) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    track={t}
                    stats={stats}
                    progress={progress}
                    mastery={mastery}
                    current={topic.week === currentWeek}
                    defaultOpen={topic.week === currentWeek || stats.status === "progress" || topic.id === hashTopic}
                    forceOpen={matches.length > 0}
                    highlight={new Set(matches)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function TopicCard({
  topic,
  track,
  stats,
  progress,
  mastery,
  current,
  defaultOpen,
  forceOpen,
  highlight,
}: {
  topic: ContentTopic;
  track: ContentTrack;
  stats: TopicStats;
  progress: Record<string, SubtopicProgressSummary>;
  mastery: Record<string, MasteryView>;
  current: boolean;
  defaultOpen: boolean;
  forceOpen: boolean;
  highlight: Set<number>;
}) {
  const [openState, setOpen] = useState<boolean | null>(null);
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const open = openState ?? (defaultOpen || forceOpen);
  const listId = `${topicAnchor(topic.id)}-subtopics`;

  const items = topic.subtopics.map((title, i) => {
    const id = `${topic.id}:${i}`;
    const sub = mastery[id];
    return {
      id,
      title,
      done: !!progress[id],
      meta: sub?.attempts ? `practice ${sub.score}% · ${sub.attempts} run${sub.attempts === 1 ? "" : "s"}` : undefined,
    };
  });
  const firstUndone = items.find((i) => !i.done);
  const allDone = stats.done === stats.total;
  const topicMastery = mastery[topic.id];
  const { mastered } = stats;

  return (
    <Card
      id={topicAnchor(topic.id)}
      className={cn("scroll-mt-20", current && "ring-2 ring-primary/50")}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TrackChip color={track.color}>Week {topic.week}</TrackChip>
          <span className="text-xs text-muted-foreground">{LEVELS[topic.level]}</span>
          {current && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              <CalendarClock className="size-3" aria-hidden /> This week
            </span>
          )}
          {mastered ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <Award className="size-3" aria-hidden /> Mastered
            </span>
          ) : allDone ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <Check className="size-3" aria-hidden /> Studied
            </span>
          ) : null}
        </div>
        <CardTitle className="text-base leading-snug">{topic.title}</CardTitle>
        <div className="flex items-center gap-3">
          <Progress value={(stats.done / stats.total) * 100} aria-label={`${topic.title} progress`} />
          <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
            {stats.done}/{stats.total}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={listId}
          className="-mx-2 flex min-h-10 w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {open ? (
            <span className="flex-1 font-medium">Subtopics</span>
          ) : firstUndone ? (
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Next up</span>
              <span className="flex items-center gap-1.5 truncate">
                <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{firstUndone.title}</span>
              </span>
            </span>
          ) : (
            <span className="flex-1 text-muted-foreground">All {stats.total} subtopics ticked</span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">{open ? "Hide" : `Show ${stats.total}`}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        </button>

        {open && (
          <div id={listId}>
            <SubtopicChecklist
              items={items.map((item, i) => (highlight.has(i) ? { ...item, meta: item.meta ? `${item.meta} · matches search` : "matches search" } : item))}
              renderExtra={(item) => (
                <div className="mt-0.5 ml-5 flex flex-wrap items-center gap-1">
                  <Link
                    href={`/learn/practice?ref=${encodeURIComponent(item.id)}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-7"
                  >
                    <Sparkles className="size-3" aria-hidden /> Practice
                  </Link>
                  {item.done && (
                    <button
                      type="button"
                      onClick={() => setOpenNotes(openNotes === item.id ? null : item.id)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-7"
                      aria-expanded={openNotes === item.id}
                    >
                      <NotebookPen className="size-3" aria-hidden /> {progress[item.id]?.notes ? "Notes" : "Add notes"}
                    </button>
                  )}
                  {item.done && openNotes === item.id && (
                    <div className="w-full pt-1">
                      <MarkdownNotes
                        compact
                        initial={progress[item.id]?.notes ?? ""}
                        onSave={(notes) => updateSubtopicNotes({ id: item.id, notes })}
                        template={track.id === "hld" ? { label: "Design template", text: DESIGN_TEMPLATE } : undefined}
                      />
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          {allDone || mastered ? (
            <Button size="sm" variant={mastered ? "secondary" : "default"} asChild className="h-9 w-full sm:w-auto">
              <Link href={`/learn/practice?ref=${encodeURIComponent(topic.id)}`}>
                <Award /> {mastered ? `Retake topic quiz · best ${topicMastery?.bestPct ?? 0}%` : "Take topic quiz"}
              </Link>
            </Button>
          ) : (
            <>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" aria-hidden />
                Topic quiz unlocks after {stats.total - stats.done} more subtopic{stats.total - stats.done === 1 ? "" : "s"}
              </p>
              {firstUndone && (
                <Button size="sm" variant="outline" asChild className="h-9 w-full sm:w-auto">
                  <Link href={`/learn/practice?ref=${encodeURIComponent(firstUndone.id)}`}>
                    <Sparkles /> Practice next
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>

        {topic.resources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Resources</p>
            <div className="flex flex-wrap gap-1.5">
              {topic.resources.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-8"
                >
                  <span className="truncate">{hostname(url)}</span>
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
