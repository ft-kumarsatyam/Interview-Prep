"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, NotebookPen, Sparkles } from "lucide-react";
import { updateSubtopicNotes } from "@/app/(app)/dashboard/actions";
import { LessonCard } from "@/components/learn/lesson-card";
import { SubtopicChecklist, type ChecklistItem } from "@/components/progress/subtopic-checklist";
import { MarkdownNotes } from "@/components/shared/markdown-notes";
import type { SubtopicNote } from "@/lib/domain/notes";

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

const linkClass =
  "inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-7";

/** The topic checklist: tick, practise and take notes on each subtopic. */
export function TopicStudy({
  items,
  notes,
  lessons,
  nextId,
  designTemplate,
}: {
  items: ChecklistItem[];
  notes: Record<string, string>;
  /** Authored lessons by subtopic id; subtopics without one just show Practice. */
  lessons: Record<string, SubtopicNote>;
  nextId: string | null;
  designTemplate: boolean;
}) {
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  return (
    <SubtopicChecklist
      items={items.map((item) => (item.id === nextId ? { ...item, meta: item.meta ? `Up next · ${item.meta}` : "Up next" } : item))}
      highlightId={nextId}
      renderExtra={(item) => (
        <div className="mt-0.5 ml-7 flex flex-wrap items-center gap-1">
          <Link href={`/learn/practice?ref=${encodeURIComponent(item.id)}`} className={`${linkClass} text-primary hover:bg-primary/10`}>
            <Sparkles className="size-3" aria-hidden /> Practice
          </Link>
          {lessons[item.id] && (
            <button
              type="button"
              onClick={() => setOpenLesson(openLesson === item.id ? null : item.id)}
              className={`${linkClass} text-primary hover:bg-primary/10`}
              aria-expanded={openLesson === item.id}
            >
              <BookOpen className="size-3" aria-hidden /> {openLesson === item.id ? "Hide lesson" : "Read lesson"}
            </button>
          )}
          {item.done && (
            <button
              type="button"
              onClick={() => setOpenNotes(openNotes === item.id ? null : item.id)}
              className={`${linkClass} text-muted-foreground hover:bg-muted hover:text-foreground`}
              aria-expanded={openNotes === item.id}
            >
              <NotebookPen className="size-3" aria-hidden /> {notes[item.id] ? "Notes" : "Add notes"}
            </button>
          )}
          {lessons[item.id] && openLesson === item.id && (
            <div className="w-full pt-1">
              <LessonCard title={item.title} note={lessons[item.id]} />
            </div>
          )}
          {item.done && openNotes === item.id && (
            <div className="w-full pt-1">
              <MarkdownNotes
                compact
                initial={notes[item.id] ?? ""}
                onSave={(text) => updateSubtopicNotes({ id: item.id, notes: text })}
                template={designTemplate ? { label: "Design template", text: DESIGN_TEMPLATE } : undefined}
              />
            </div>
          )}
        </div>
      )}
    />
  );
}
