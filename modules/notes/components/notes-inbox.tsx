"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCapturedNoteAction, updateCapturedNoteAction } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CapturedNoteView } from "@/modules/notes/services/notes";
import { NOTE_COLORS, type NoteColor } from "@/modules/notes/domain/notes";

const COLOR_CLASS: Record<NoteColor, string> = {
  yellow: "border-l-yellow-400",
  blue: "border-l-blue-400",
  green: "border-l-green-400",
  pink: "border-l-pink-400",
  purple: "border-l-purple-400",
};
const DOT_CLASS: Record<NoteColor, string> = {
  yellow: "bg-yellow-300",
  blue: "bg-blue-300",
  green: "bg-green-300",
  pink: "bg-pink-300",
  purple: "bg-purple-300",
};

export function NotesInbox({ initial }: { initial: CapturedNoteView[] }) {
  const [notes, setNotes] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (note: CapturedNoteView, body: string, title: string) => startTransition(async () => {
    const result = await updateCapturedNoteAction({ id: note.id, body, title });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNotes((rows) => rows.map((row) => row.id === note.id ? { ...row, body, title } : row));
    setEditing(null);
    toast.success("Note saved");
  });

  const review = (note: CapturedNoteView) => startTransition(async () => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = await updateCapturedNoteAction({ id: note.id, reviewOn: date, tags: [...new Set([...note.tags, "review"])] });
    if (!result.ok) toast.error(result.error);
    else setNotes((rows) => rows.map((row) => row.id === note.id ? { ...row, reviewOn: date, tags: [...new Set([...row.tags, "review"])] } : row));
  });

  const remove = (id: string) => startTransition(async () => {
    const result = await deleteCapturedNoteAction(id);
    if (!result.ok) toast.error(result.error);
    else setNotes((rows) => rows.filter((row) => row.id !== id));
  });

  if (notes.length === 0) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No captured notes yet. Select text anywhere in a lesson, article, problem, or design case to save it here.</div>;
  }

  return (
    <ul className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className={`rounded-xl border border-l-4 bg-card p-4 ring-1 ring-foreground/5 ${COLOR_CLASS[note.highlightColor]}`}>
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              {editing === note.id ? (
                <input defaultValue={note.title} id={`title-${note.id}`} className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium" aria-label="Note title" />
              ) : <h2 className="font-medium">{note.title}</h2>}
              <p className="mt-1 text-xs text-muted-foreground">{note.source.title} · {note.source.kind}{note.reviewOn ? ` · review ${note.reviewOn}` : ""}</p>
            </div>
            <div className="flex gap-1">
              <div className="flex items-center gap-1 rounded-md border px-1" aria-label="Highlight color">
                {NOTE_COLORS.map((color) => <button key={color} type="button" aria-label={`Change highlight to ${color}`} aria-pressed={note.highlightColor === color} className={`size-3 rounded-full ${DOT_CLASS[color]} ${note.highlightColor === color ? "ring-2 ring-primary ring-offset-1" : ""}`} onClick={() => startTransition(async () => {
                  const result = await updateCapturedNoteAction({ id: note.id, highlightColor: color });
                  if (result.ok) setNotes((rows) => rows.map((row) => row.id === note.id ? { ...row, highlightColor: color } : row));
                })} />)}
              </div>
              <Button size="xs" variant="outline" disabled={pending} onClick={() => review(note)}>Review tomorrow</Button>
              <Button size="icon-xs" variant="ghost" disabled={pending} onClick={() => remove(note.id)} aria-label={`Delete ${note.title}`}><Trash2 /></Button>
            </div>
          </div>
          <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">{note.excerpt}</blockquote>
          {editing === note.id ? (
            <div className="mt-3 space-y-2">
              <Textarea defaultValue={note.body} id={`body-${note.id}`} aria-label="Note body" className="min-h-28" />
              <Button size="sm" disabled={pending} onClick={() => {
                const title = document.getElementById(`title-${note.id}`) as HTMLInputElement | null;
                const body = document.getElementById(`body-${note.id}`) as HTMLTextAreaElement | null;
                if (title && body) save(note, body.value, title.value);
              }}><Save /> Save note</Button>
            </div>
          ) : (
            <button type="button" className="mt-3 block w-full text-left text-sm whitespace-pre-wrap text-foreground/80 hover:text-foreground" onClick={() => setEditing(note.id)}>{note.body || "Click to add your own explanation…"}</button>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {note.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 text-muted-foreground">#{tag}</span>)}
            <Link href={note.source.href} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3.5" /> Jump to source</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
