"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCapturedNoteAction, updateCapturedNoteAction } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/components/shared/use-autosave";
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
            <NoteEditor
              note={note}
              disabled={pending}
              onSaved={(patch) => setNotes((rows) => rows.map((row) => row.id === note.id ? { ...row, ...patch } : row))}
              onClose={() => setEditing(null)}
            />
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

function NoteEditor({
  note,
  disabled,
  onSaved,
  onClose,
}: {
  note: CapturedNoteView;
  disabled: boolean;
  onSaved: (patch: { title: string; body: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const status = useAutosave(
    { title, body },
    async (draft) => {
      const result = await updateCapturedNoteAction({ id: note.id, ...draft });
      if (!result.ok) throw new Error(result.error);
      onSaved(draft);
    },
    { delayMs: 900 },
  );

  return (
    <div className="mt-3 space-y-2">
      <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Note title" className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium" />
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} aria-label="Note body" className="min-h-28" />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={onClose}><Save /> Done</Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "error" ? "Couldn’t autosave — try again" : status === "saved" ? "Saved" : "Draft"}
        </span>
      </div>
    </div>
  );
}
