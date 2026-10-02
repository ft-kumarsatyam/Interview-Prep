"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Code2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./nav-items";

interface PaletteIndex {
  problems: Array<{ slug: string; title: string; difficulty: string; track: string }>;
  topics: Array<{ id: string; title: string; track: string; week: number }>;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<PaletteIndex | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || index) return;
    fetch("/api/palette")
      .then((r) => (r.ok ? (r.json() as Promise<PaletteIndex>) : null))
      .then((data) => data && setIndex(data))
      .catch(() => undefined);
  }, [open, index]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 text-muted-foreground" aria-label="Search (Command K)">
        <Search />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search PrepOS" description="Jump to a page, problem or topic">
        <Command>
        <CommandInput placeholder="Problem, topic or page…" />
        <CommandList>
          <CommandEmpty>{index ? "No matches." : "Loading…"}</CommandEmpty>
          <CommandGroup heading="Pages">
            {NAV_ITEMS.map((n) => (
              <CommandItem key={n.href} value={`page ${n.label}`} onSelect={() => go(n.href)}>
                <n.icon /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {index && (
            <>
              <CommandGroup heading="Topics">
                {index.topics.map((t) => (
                  <CommandItem key={t.id} value={`topic ${t.title} ${t.track}`} onSelect={() => go(`/learn?track=${t.track}`)}>
                    <BookOpen /> {t.title}
                    <CommandShortcut>wk {t.week}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Problems">
                {index.problems.map((p) => (
                  <CommandItem key={p.slug} value={`problem ${p.title} ${p.slug}`} onSelect={() => go(`/dsa/${p.slug}`)}>
                    <Code2 /> {p.title}
                    <CommandShortcut>{p.track === "main" ? p.difficulty : p.track.toUpperCase()}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
