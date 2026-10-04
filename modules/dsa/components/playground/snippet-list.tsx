"use client";

import { useEffect, useMemo, useState } from "react";
import { FileCode2, FilePlus2, Search, SearchX, Trash2 } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { filterSnippets, parseTags, tagCounts } from "@/modules/dsa/lib/playground/tags";
import type { SnippetSummary } from "@/modules/dsa/services/snippets";
import { cn } from "@/core/utils";

export function SnippetList({
  snippets,
  currentId,
  onOpen,
  onNew,
  onDelete,
  deleting,
}: {
  snippets: SnippetSummary[];
  currentId?: string;
  onOpen: (s: SnippetSummary) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const tags = useMemo(() => tagCounts(snippets), [snippets]);
  const visible = useMemo(() => filterSnippets(snippets, query, activeTag), [snippets, query, activeTag]);

  useEffect(() => {
    if (!confirmId) return;
    const t = setTimeout(() => setConfirmId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmId]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          Snippets <span className="font-mono text-xs text-muted-foreground tabular">{snippets.length}</span>
        </h2>
        <Button size="sm" variant="outline" className="h-9" onClick={onNew}>
          <FilePlus2 /> New
        </Button>
      </div>

      {snippets.length === 0 ? (
        <EmptyState compact icon={FileCode2} title="No snippets yet">
          Write something worth keeping, then hit Save. Tag it by topic, e.g. js-async, closures.
        </EmptyState>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search snippets" className="h-9 pl-8 text-sm" aria-label="Search snippets" />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
              {tags.map((t) => {
                const on = activeTag?.toLowerCase() === t.tag.toLowerCase();
                return (
                  <Chip key={t.tag} pressed={on} onClick={() => setActiveTag(on ? null : t.tag)} count={t.count} className="h-7 min-h-7 px-2.5 text-xs">
                    #{t.tag}
                  </Chip>
                );
              })}
            </div>
          )}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
              <SearchX className="size-5" aria-hidden />
              No snippets match.
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setActiveTag(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <ul className="-mx-1 space-y-0.5 overflow-y-auto">
              {visible.map((s) => {
                const confirming = confirmId === s.id;
                const tagList = parseTags(s.tag);
                return (
                  <li key={s.id} className={cn("group flex items-center gap-1 rounded-md px-1", currentId === s.id ? "bg-primary/10" : "hover:bg-muted")}>
                    <button
                      type="button"
                      onClick={() => onOpen(s)}
                      aria-current={currentId === s.id ? "true" : undefined}
                      className="min-h-11 min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className={cn("block truncate", currentId === s.id && "font-medium text-primary")}>{s.title}</span>
                      {tagList.length > 0 && <span className="block truncate text-xs text-muted-foreground">{tagList.map((t) => `#${t}`).join(" ")}</span>}
                    </button>
                    {confirming ? (
                      <Button size="sm" variant="destructive" className="h-8" disabled={deleting} onClick={() => onDelete(s.id)}>
                        Delete?
                      </Button>
                    ) : (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-9 text-muted-foreground opacity-100 hover:text-destructive lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
                        aria-label={`Delete ${s.title}`}
                        onClick={() => setConfirmId(s.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
