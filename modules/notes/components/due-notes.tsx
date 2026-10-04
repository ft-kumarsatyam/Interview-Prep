"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ExternalLink, StickyNote } from "lucide-react";
import { updateCapturedNoteAction } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import type { CapturedNoteView } from "@/modules/notes/services/notes";

export function DueNotes({ initial }: { initial: CapturedNoteView[] }) {
  const [notes, setNotes] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (notes.length === 0) return null;

  const markDone = (note: CapturedNoteView) => startTransition(async () => {
    const result = await updateCapturedNoteAction({ id: note.id, reviewOn: null });
    if (result.ok) setNotes((rows) => rows.filter((row) => row.id !== note.id));
  });

  return (
    <section className="mt-6 rounded-xl border bg-card p-4 ring-1 ring-foreground/5" aria-labelledby="due-notes">
      <h2 id="due-notes" className="flex items-center gap-2 text-base font-semibold"><StickyNote className="size-4 text-primary" /> Captured notes due</h2>
      <p className="mt-1 text-sm text-muted-foreground">These are separate from DSA review and never change streak completion.</p>
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <span className="min-w-0 flex-1 text-sm font-medium">{note.title}</span>
            <Link href={note.source.href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"><ExternalLink className="size-3.5" /> Source</Link>
            <Button size="xs" variant="outline" disabled={pending} onClick={() => markDone(note)}><Check /> Reviewed</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
