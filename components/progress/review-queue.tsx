"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ExternalLink, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { markSolved } from "@/app/(app)/dashboard/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { DifficultyBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { ReviewItem } from "@/lib/services/problems";

const RATINGS = [
  { id: "easy", label: "Easy" },
  { id: "ok", label: "OK" },
  { id: "struggled", label: "Struggled" },
] as const;

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const [, startTransition] = useTransition();
  const [done, markDone] = useOptimistic(new Set<string>(), (s: Set<string>, slug: string) => new Set(s).add(slug));
  const remaining = items.filter((i) => !done.has(i.slug) && !i.solvedToday);

  function rate(item: ReviewItem, confidence: (typeof RATINGS)[number]["id"]) {
    startTransition(async () => {
      markDone(item.slug);
      const res = await markSolved({ slug: item.slug, confidence });
      if (!res.ok) toast.error(`${res.error}. Rate it again.`);
      else {
        toast.success(`${item.title}: re-solved (${confidence})`);
        if (res.justCompleted) await celebrateDayComplete();
      }
    });
  }

  if (remaining.length === 0) {
    return (
      <EmptyState icon={PartyPopper} title="Nothing due. 🎉">
        Reviews show up here 3, 7 or 21 days after a struggled solve, and 14 days after an OK one.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-live="polite">
      {remaining.map((item) => (
        <li key={item.slug} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/dsa/${item.slug}`} className="font-medium hover:text-primary">
                {item.title}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <DifficultyBadge difficulty={item.difficulty} />
                {item.pattern} · due {item.nextReviewAt} · last: {item.confidence ?? "—"} · review #{item.reviewCount + 1}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                Open <ExternalLink />
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Re-solved:</span>
            {RATINGS.map((r) => (
              <Button key={r.id} size="sm" variant={r.id === "struggled" ? "destructive" : "secondary"} onClick={() => rate(item, r.id)}>
                {r.label}
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
