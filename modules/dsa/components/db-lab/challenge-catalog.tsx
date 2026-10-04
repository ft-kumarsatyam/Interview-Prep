"use client";

import { useState } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { cn } from "@/core/utils";
import type { DbChallenge, Difficulty } from "@/modules/dsa/domain/db-lab";
import type { TopicGroup } from "@/modules/dsa/domain/db-lab-topics";

export type CatalogFilter = "all" | Difficulty;

export interface ChallengeCatalogProps {
  groups: TopicGroup[];
  activeId: string | null;
  solved: ReadonlySet<string>;
  filter: CatalogFilter;
  onFilter: (f: CatalogFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  onPick: (c: DbChallenge) => void;
  /** Dataset id -> label, shown on each row so a challenge says which data it runs on. */
  datasetLabel: (id: string) => string;
  /** How many challenges exist before filtering, for the empty message. */
  total: number;
}

/**
 * The challenge catalogue: topics in teaching order, each a collapsible section with its own progress, easy before hard
 * inside. A topic opens by default when it holds the open challenge or is the first with something left to solve.
 * Presentational: it reports clicks and filter changes upward.
 */
export function ChallengeCatalog({ groups, activeId, solved, filter, onFilter, query, onQuery, onPick, datasetLabel, total }: ChallengeCatalogProps) {
  const firstWithWork = groups.find((g) => g.solved < g.challenges.length)?.topic.id;
  const holdingActive = groups.find((g) => g.challenges.some((c) => c.id === activeId))?.topic.id;
  // `toggled` records only what the person opened or closed; everything else follows the default rule above.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const searching = query.trim().length > 0 || filter !== "all";
  const isOpen = (id: string) => toggled[id] ?? (searching || id === holdingActive || id === firstWithWork);
  const shown = groups.reduce((n, g) => n + g.challenges.length, 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="db-lab-search" className="sr-only">
          Search challenges
        </label>
        <input
          id="db-lab-search"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search by title, topic or concept"
          className="h-9 w-full rounded-md border bg-background pr-2 pl-8 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by difficulty">
        {(["all", "Easy", "Medium", "Hard"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === f ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{total === 0 ? "No challenges here yet." : "Nothing matches. Clear the search or the difficulty filter."}</p>
      ) : (
        <>
          {searching && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {shown} challenge{shown === 1 ? "" : "s"} match
            </p>
          )}
          <ul className="space-y-2">
            {groups.map((g) => {
              const open = isOpen(g.topic.id);
              const panelId = `db-topic-${g.topic.id}`;
              return (
                <li key={g.topic.id} className="rounded-lg border">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setToggled((t) => ({ ...t, [g.topic.id]: !open }))}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{g.topic.label}</span>
                      <span className="block truncate text-2xs text-muted-foreground">{g.topic.blurb}</span>
                    </span>
                    <span className={cn("font-mono text-2xs tabular", g.solved === g.challenges.length ? "text-success" : "text-muted-foreground")} aria-label={`${g.solved} of ${g.challenges.length} solved`}>
                      {g.solved}/{g.challenges.length}
                    </span>
                  </button>
                  {open && (
                    <ul id={panelId} className="space-y-1 border-t p-1.5">
                      {g.challenges.map((c, i) => {
                        const done = solved.has(c.id);
                        const isActive = activeId === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => onPick(c)}
                              aria-current={isActive ? "true" : undefined}
                              className={cn(
                                "flex min-h-11 w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                isActive && "bg-primary/5 ring-1 ring-primary/40",
                              )}
                            >
                              <span
                                className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-2xs tabular", done ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}
                                aria-label={done ? "Solved" : undefined}
                              >
                                {done ? <Check className="size-3" aria-hidden /> : i + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block leading-snug font-medium">{c.title}</span>
                                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <DifficultyBadge difficulty={c.difficulty} />
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">{datasetLabel(c.dataset)}</span>
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
