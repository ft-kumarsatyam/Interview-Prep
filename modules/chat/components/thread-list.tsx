"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquare, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/core/utils";

export interface ThreadItem {
  id: string;
  title: string;
  lastMessageAt: string;
}

/** Your conversations: new chat, search by title, open, rename and delete. */
export function ThreadList({
  threads,
  activeId,
  onRename,
  onDelete,
  onNavigate,
}: {
  threads: ThreadItem[];
  activeId: string | null;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  /** Called after a link is followed (closes the mobile sheet). */
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<ThreadItem | null>(null);
  const [deleting, setDeleting] = useState<ThreadItem | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = query.trim() ? threads.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())) : threads;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button asChild className="h-9 w-full justify-start">
        <Link href="/chat" onClick={onNavigate}>
          <Plus aria-hidden /> New chat
        </Link>
      </Button>
      <label className="relative block">
        <span className="sr-only">Search conversations</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="h-9 w-full rounded-lg border bg-background pr-3 pl-8 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </label>
      <nav aria-label="Conversations" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {shown.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">{threads.length ? "No chat matches." : "No conversations yet."}</p>
        ) : (
          <ul className="space-y-0.5">
            {shown.map((t) => (
              <li key={t.id} className={cn("group flex items-center gap-1 rounded-lg pr-1", t.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
                <Link href={`/chat?t=${t.id}`} onClick={onNavigate} aria-current={t.id === activeId ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm">
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{t.title}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100" aria-label={`Options for ${t.title}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setName(t.title);
                        setRenaming(t);
                      }}
                    >
                      <Pencil aria-hidden /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(t)}>
                      <Trash2 aria-hidden /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!renaming) return;
              setBusy(true);
              const ok = await onRename(renaming.id, name);
              setBusy(false);
              if (ok) setRenaming(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename conversation</DialogTitle>
              <DialogDescription>Give this chat a name you will recognise later.</DialogDescription>
            </DialogHeader>
            <label htmlFor="thread-name" className="sr-only">
              Name
            </label>
            <input
              id="thread-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              className="my-4 h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>&ldquo;{deleting?.title}&rdquo; and all its messages are removed for good.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!deleting) return;
                setBusy(true);
                const ok = await onDelete(deleting.id);
                setBusy(false);
                if (ok) setDeleting(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
