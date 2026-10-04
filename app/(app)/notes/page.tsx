import type { Metadata } from "next";
import { Highlighter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { NotesInbox } from "@/modules/notes/components/notes-inbox";
import { listCapturedNotes } from "@/modules/notes/services/notes";

export const metadata: Metadata = { title: "Notes inbox" };

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const notes = await listCapturedNotes({ search });
  return (
    <>
      <PageHeader icon={Highlighter} title="Notes inbox" description="Capture useful explanations from anywhere, keep the source attached, and schedule small review loops." />
      <div className="mb-4 flex gap-2">
        <form className="flex min-w-0 flex-1 gap-2" action="/notes">
          <input name="q" defaultValue={search} placeholder="Search captured notes…" className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" />
          <button className="rounded-lg border px-3 text-sm hover:bg-muted" type="submit">Search</button>
        </form>
      </div>
      <NotesInbox initial={notes} />
    </>
  );
}
