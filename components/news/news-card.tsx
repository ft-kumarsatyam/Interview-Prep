"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Bookmark, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { bookmarkAction, markReadAction } from "@/app/(app)/news/actions";
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
      if (res.ok && res.readings === readingsGoal) toast.success(`Read ${readingsGoal} today. Bonus done.`);
    });
  };

  const onBookmark = () =>
    start(async () => {
      setState({ bookmarked: !state.bookmarked });
      const res = await bookmarkAction({ id: item.id, bookmarked: !state.bookmarked });
      if (!res.ok) toast.error(res.error);
    });

  return (
    <article className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors", state.read && "opacity-70")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://icons.duckduckgo.com/ip3/${host}.ico`} alt="" width={14} height={14} className="size-3.5 rounded-sm" loading="lazy" />
        <span className="truncate font-medium text-foreground/80">{item.sourceName}</span>
        {item.age && (
          <>
            <span aria-hidden>·</span>
            <span className="shrink-0">{item.age}</span>
          </>
        )}
        {!state.read && <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </div>
      <Link href={`/news/${item.id}`} className="font-medium leading-snug hover:text-primary hover:underline">
        {item.title}
      </Link>
      {(item.summary || item.snippet) && <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary ?? item.snippet}</p>}
      {item.readingMinutes || item.tags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {item.readingMinutes ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success">
              <Clock className="size-3" aria-hidden /> {item.readingMinutes} min · full article
            </span>
          ) : null}
          {item.tags?.slice(0, 2).map((t) => (
            <span key={t.id} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {t.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="truncate text-xs text-muted-foreground">{item.categoryName}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onBookmark} aria-pressed={state.bookmarked} aria-label={state.bookmarked ? "Remove bookmark" : "Bookmark"}>
            <Bookmark className={cn(state.bookmarked && "fill-primary text-primary")} />
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Open original in a new tab">
            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={onOpenOriginal} onAuxClick={onOpenOriginal}>
              <ExternalLink />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/news/${item.id}`}>Read</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
