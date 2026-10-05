import { SelectionToolbar } from "@/components/shared/selection-toolbar";
import { StickyNotesDock } from "@/components/layout/sticky-notes-dock";
import { listCapturedNotes } from "@/modules/notes/services/notes";

export async function CapturedNotesSection() {
  const notes = await listCapturedNotes();
  return (
    <>
      <SelectionToolbar highlights={notes.map((note) => ({ href: note.source.href, excerpt: note.excerpt, highlightColor: note.highlightColor }))} />
      <StickyNotesDock notes={notes.slice(0, 12)} />
    </>
  );
}
