"use client";

import Link from "next/link";
import { useOptimistic, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import type { Difficulty } from "@/lib/content";
import { cn } from "@/lib/utils";
import { SolveSheet, type SolveTarget } from "./solve-sheet";

export interface ProblemListItem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  url: string;
  solved: boolean;
  tag?: string;
}

export function ProblemList({ items, empty }: { items: ProblemListItem[]; empty?: string }) {
  const [target, setTarget] = useState<SolveTarget | null>(null);
  const [solved, addSolved] = useOptimistic(
    new Set(items.filter((i) => i.solved).map((i) => i.slug)),
    (state: Set<string>, slug: string) => new Set(state).add(slug),
  );

  if (items.length === 0) return <p className="py-4 text-sm text-muted-foreground">{empty ?? "Nothing here."}</p>;

  return (
    <>
      <ul className="divide-y" aria-live="polite">
        {items.map((p) => {
          const done = solved.has(p.slug);
          return (
            <li key={p.slug} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Link href={`/dsa/${p.slug}`} className={cn("block truncate text-sm font-medium hover:text-primary", done && "text-muted-foreground line-through")}>
                  {p.title}
                </Link>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <DifficultyBadge difficulty={p.difficulty} />
                  <span className="truncate">{p.pattern}</span>
                  {p.tag && <span className="rounded-full bg-muted px-2 py-0.5">{p.tag}</span>}
                </p>
              </div>
              <Button variant="ghost" size="icon" asChild aria-label={`Open ${p.title} on LeetCode`}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                </a>
              </Button>
              <Button
                variant={done ? "secondary" : "outline"}
                size="icon"
                aria-label={done ? `${p.title} solved, edit details` : `Mark ${p.title} solved`}
                onClick={() => setTarget({ slug: p.slug, title: p.title })}
                className={cn(done && "text-success")}
              >
                <Check />
              </Button>
            </li>
          );
        })}
      </ul>
      <SolveSheet target={target} onOpenChange={(o) => !o && setTarget(null)} onSolved={addSolved} />
    </>
  );
}
