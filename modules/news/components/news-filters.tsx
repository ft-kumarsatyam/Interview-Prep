import Link from "next/link";
import { Bookmark, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { ChipLink, ChipStrip } from "@/components/shared/chip-strip";
import { Button } from "@/components/ui/button";
import { news } from "@/core/content";
import { ARTICLE_TAGS } from "@/modules/news/domain/article";
import { newsHref, type NewsParams } from "@/modules/news/components/news-url";
import type { NewsFilter } from "@/modules/news/services/news";
import { cn } from "@/core/utils";

export const NEWS_FILTERS: Array<{ id: NewsFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "full", label: "Full articles" },
  { id: "bookmarked", label: "Bookmarked" },
];

type Props = {
  current: NewsParams;
  unread: number;
  keywordFeeds: Array<{ id: string; name: string }>;
  articleCount: number;
};

/** Read-status tabs, category chips, topic/keyword drawer and the active-filter summary. */
export function NewsFilters({ current, unread, keywordFeeds, articleCount }: Props) {
  const { cat, src, tag, f } = current;
  const unfiltered = !cat && !src && !tag && f === "all";
  const tagName = ARTICLE_TAGS.find((t) => t.id === tag)?.label;
  const srcName = keywordFeeds.find((k) => k.id === src)?.name.replace(/^Google News · /, "");
  const moreActive = !!tag || !!src;
  return (
    <div className="space-y-3">
      <ChipStrip label="Filter">
        <div role="group" aria-label="Read status" className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-0.5">
          {NEWS_FILTERS.map((x) => (
            <Link
              key={x.id}
              href={newsHref(current, { f: x.id })}
              scroll={false}
              aria-current={f === x.id ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                f === x.id && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {x.id === "bookmarked" && <Bookmark className="size-3.5" aria-hidden />}
              {x.label}
              {x.id === "unread" && unread > 0 && <span className="tabular rounded-full bg-primary/15 px-1.5 text-xs text-primary">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ))}
        </div>
      </ChipStrip>

      <ChipStrip label="Categories">
        <ChipLink to={newsHref(current, { cat: undefined, src: undefined })} active={!cat && !src}>
          All categories
        </ChipLink>
        {news.categories.map((c) => (
          <ChipLink key={c.id} to={newsHref(current, { cat: c.id, src: undefined })} active={cat === c.id}>
            {c.name}
          </ChipLink>
        ))}
      </ChipStrip>

      <details className="group rounded-xl border bg-card/50 open:bg-card" open={moreActive || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
          Topics and Google News keywords
          {moreActive && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{(tag ? 1 : 0) + (src ? 1 : 0)} on</span>}
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t px-3 py-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Topics</p>
            <ChipStrip label="Topics" className="-mx-3 px-3 lg:mx-0 lg:px-0">
              {ARTICLE_TAGS.map((t) => (
                <ChipLink key={t.id} to={newsHref(current, { tag: tag === t.id ? undefined : t.id })} active={tag === t.id}>
                  {t.label}
                </ChipLink>
              ))}
            </ChipStrip>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Google News{" "}
              <Link href="/settings#news" className="font-normal tracking-normal normal-case underline-offset-2 hover:text-foreground hover:underline">
                (edit keywords)
              </Link>
            </p>
            <ChipStrip label="Google News keywords" className="-mx-3 px-3 lg:mx-0 lg:px-0">
              {keywordFeeds.map((k) => (
                <ChipLink key={k.id} to={newsHref(current, { src: src === k.id ? undefined : k.id, cat: undefined })} active={src === k.id}>
                  {k.name.replace(/^Google News · /, "")}
                </ChipLink>
              ))}
            </ChipStrip>
          </div>
        </div>
      </details>

      {!unfiltered && (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
          <span className="text-muted-foreground">
            {articleCount} article{articleCount === 1 ? "" : "s"}
            {tagName && (
              <>
                {" "}
                · topic <span className="text-foreground">{tagName}</span>
              </>
            )}
            {srcName && (
              <>
                {" "}
                · keyword <span className="text-foreground">{srcName}</span>
              </>
            )}
          </span>
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link href="/news" scroll={false}>
              <X /> Clear filters
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
