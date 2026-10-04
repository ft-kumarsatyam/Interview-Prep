"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, StickyNote, X } from "lucide-react";
import type { CapturedNoteView } from "@/modules/notes/services/notes";

const COLOR_CLASS: Record<CapturedNoteView["highlightColor"], string> = {
  yellow: "border-l-yellow-400",
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  pink: "border-l-pink-400",
  purple: "border-l-purple-400",
};

/** A small, non-blocking note pile: collapsed by default, expands on hover or keyboard focus. */
export function StickyNotesDock({ notes }: { notes: CapturedNoteView[] }) {
  const [closed, setClosed] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (closed || notes.length === 0) return null;

  return (
    <div className={`group fixed bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] left-3 z-40 sm:left-5 lg:bottom-5 lg:left-20 ${pinned || expanded ? "w-80" : "w-12 hover:w-80 focus-within:w-80"} transition-[width] duration-200`}>
      <div className="overflow-hidden rounded-2xl border bg-card/95 shadow-lg backdrop-blur">
        <div className="flex h-11 cursor-pointer items-center gap-2 px-3" onClick={() => setExpanded((value) => !value)}>
          <StickyNote className="size-4 shrink-0 text-primary" aria-hidden />
          <span className={`${expanded ? "block" : "hidden group-hover:block group-focus-within:block"} min-w-0 flex-1 truncate text-xs font-medium`}>{notes.length} sticky note{notes.length === 1 ? "" : "s"}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); setPinned((value) => !value); }} className={`${expanded ? "block" : "hidden group-hover:block group-focus-within:block"} rounded p-1 text-xs text-muted-foreground hover:bg-muted`} aria-label={pinned ? "Unpin sticky notes" : "Keep sticky notes open"}>{pinned ? "−" : "+"}</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setClosed(true); }} className={`${expanded ? "block" : "hidden group-hover:block group-focus-within:block"} rounded p-1 text-muted-foreground hover:bg-muted`} aria-label="Close sticky notes"><X className="size-3.5" /></button>
        </div>
        <div className={`${expanded ? "block" : "hidden group-hover:block group-focus-within:block"} max-h-72 space-y-2 overflow-y-auto border-t p-2`}>
          {notes.slice(0, 12).map((note) => (
            <Link key={note.id} href="/notes" className={`block rounded-lg border border-l-4 bg-background p-2.5 text-xs hover:bg-muted ${COLOR_CLASS[note.highlightColor]}`}>
              <span className="block truncate font-medium">{note.title}</span>
              <span className="mt-1 block line-clamp-3 whitespace-pre-wrap text-muted-foreground">{note.body || note.excerpt}</span>
              {note.body && note.body !== note.excerpt && <span className="mt-1 block line-clamp-1 text-[11px] text-muted-foreground/70">“{note.excerpt}”</span>}
              <span className="mt-1 inline-flex items-center gap-1 text-primary">Open notes <ChevronRight className="size-3" /></span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
