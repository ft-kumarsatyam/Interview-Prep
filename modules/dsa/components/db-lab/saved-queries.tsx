"use client";

import { useState } from "react";
import { BookmarkPlus, Copy, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";

export interface SavedItem {
  id: string;
  title: string;
  sql: string;
  /** "SQL", "Postgres" or "MongoDB". */
  engine: string;
  dataset: string;
}

/** Queries saved to your account: search, load into the editor, rename, delete. */
export function SavedQueries({
  items,
  activeId,
  busy,
  onLoad,
  onRename,
  onDelete,
  onSaveCurrent,
  onSaveAs,
  modKey,
}: {
  items: SavedItem[];
  activeId: string | null;
  busy: boolean;
  onLoad: (item: SavedItem) => void;
  onRename: (item: SavedItem, title: string) => void;
  onDelete: (item: SavedItem) => void;
  onSaveCurrent: () => void;
  onSaveAs: () => void;
  modKey: string;
}) {
  const [q, setQ] = useState("");
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter((i) => terms.every((t) => `${i.title} ${i.sql} ${i.engine} ${i.dataset}`.toLowerCase().includes(t)));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search saved queries</span>
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search saved"
            className="h-9 w-full rounded-md border bg-background pr-2 pl-7 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </label>
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={onSaveCurrent} disabled={busy} title={`Save the current query (${modKey} + S)`}>
          <BookmarkPlus /> Save
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="size-9" onClick={onSaveAs} disabled={busy} aria-label="Save as a new query" title={`Save as… (${modKey} + Shift + S)`}>
          <Copy />
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          Nothing saved yet. Press <kbd className="rounded border bg-background px-1 font-mono text-2xs">{modKey}</kbd> <kbd className="rounded border bg-background px-1 font-mono text-2xs">S</kbd> in the editor to keep a query across devices.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">No saved query matches.</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((i) => (
            <li key={i.id} className={cn("rounded-lg border", i.id === activeId && "border-primary/50 bg-primary/5")}>
              <button type="button" onClick={() => onLoad(i)} className="block w-full rounded-t-lg px-2.5 py-1.5 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="block truncate text-sm font-medium">{i.title}</span>
                <span className="block text-2xs text-muted-foreground">
                  {i.engine}
                  {i.dataset ? ` · ${i.dataset}` : ""}
                </span>
                <span className="mt-0.5 line-clamp-2 font-mono text-2xs whitespace-pre-wrap text-muted-foreground">{i.sql}</span>
              </button>
              <div className="flex justify-end gap-0.5 border-t px-1 py-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  disabled={busy}
                  onClick={() => {
                    const t = window.prompt("Rename saved query", i.title)?.trim();
                    if (t && t !== i.title) onRename(i, t);
                  }}
                  aria-label={`Rename ${i.title}`}
                >
                  <Pencil />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" className="size-7" disabled={busy} onClick={() => window.confirm(`Delete "${i.title}"?`) && onDelete(i)} aria-label={`Delete ${i.title}`}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
