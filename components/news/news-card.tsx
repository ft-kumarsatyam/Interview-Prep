"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Bookmark, Check, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { bookmarkAction, markReadAction } from "@/app/(app)/news/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NewsCardItem {
  id: string;
  url: string;
  title: string;
  sourceName: string;
  categoryName: string;
  age: string | null;
  snippet: string;
  summary: string | null;
  read: boolean;
  bookmarked: boolean;
  /** Minutes of stored full text; null when the reader would have to fetch it. */
  readingMinutes?: number | null;
  tags?: Array<{ id: string; label: string }>;
}

type CardState = Pick<NewsCardItem, "read" | "bookmarked">;

export function NewsCard({ item, readingsGoal }: { item: NewsCardItem; readingsGoal: number }) {
  const [, start] = useTransition();
  const [state, setState] = useOptimistic<CardState, Partial<CardState>>({ read: item.read, bookmarked: item.bookmarked }, (s, patch) => ({ ...s, ...patch }));
  const host = new URL(item.url).hostname.replace(/^www\./, "");

  const onOpenOriginal = () => {
    if (state.read) return;
    start(async () => {
      setState({ read: true });
      const res = await markReadAction(item.id);
      if (!res.ok) toast.error(`${res.error}. Reload the page and try again.`);
      else if (res.readings === readingsGoal) toast.success(`Read ${readingsGoal} today. Bonus done.`);
    });
  };

  const onBookmark = () =>
    start(async () => {
      const next = !state.bookmarked;
      setState({ bookmarked: next });
      const res = await bookmarkAction({ id: item.id, bookmarked: next });
      if (!res.ok) toast.error(`${res.error}. Reload the page and try again.`);
      else if (next) toast.success("Bookmarked. Find it under the Bookmarked filter.");
    });

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors focus-within:border-primary/50 hover:border-primary/40",
        state.read && "bg-card/60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://icons.duckduckgo.com/ip3/${host}.ico`} alt="" width={14} height={14} className="size-3.5 shrink-0 rounded-sm" loading="lazy" />
        <span className="truncate font-medium text-foreground/80">{item.sourceName}</span>
        {item.age && (
          <>
            <span aria-hidden>·</span>
            <span className="shrink-0">{item.age}</span>
          </>
        )}
        <span className="ml-auto shrink-0">
          {state.read ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3" aria-hidden /> Read
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden /> New
            </span>
          )}
        </span>
      </div>

      <h3 className={cn("leading-snug font-medium", state.read && "text-foreground/75")}>
        <Link
          href={`/news/${item.id}`}
          className="line-clamp-3 outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-xl focus-visible:underline"
        >
          {item.title}
        </Link>
      </h3>

      {(item.summary || item.snippet) && <p className="line-clamp-2 text-sm text-muted-foreground">{item.summary ?? item.snippet}</p>}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
          {item.readingMinutes ? (
            <ToneBadge tone="success" icon={Clock}>
              {item.readingMinutes} min
              <span className="sr-only">, full article</span>
            </ToneBadge>
          ) : null}
          {item.tags?.[0] ? (
            <span className="truncate rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{item.tags[0].label}</span>
          ) : (
            <span className="truncate text-muted-foreground">{item.categoryName}</span>
          )}
        </div>
        <div className="relative z-10 -mr-1.5 flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onBookmark}
            aria-pressed={state.bookmarked}
            aria-label={state.bookmarked ? "Remove bookmark" : "Bookmark"}
            title={state.bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={cn(state.bookmarked && "fill-primary text-primary")} />
          </Button>
          <Button asChild variant="ghost" size="icon-lg">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpenOriginal}
              onAuxClick={onOpenOriginal}
              aria-label={`Open original on ${host} in a new tab`}
              title={`Open on ${host}`}
            >
              <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
