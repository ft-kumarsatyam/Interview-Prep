import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Bookmark, BookOpenCheck, ChevronDown, Clock, ExternalLink, Inbox, Newspaper, SlidersHorizontal, X } from "lucide-react";
import { toCardItem } from "@/components/news/card-item";
import { NewsCard } from "@/components/news/news-card";
import { RefreshNewsButton } from "@/components/news/refresh-news-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { chipClass } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { news } from "@/lib/content";
import { ARTICLE_TAGS, diversify } from "@/lib/domain/article";
import { googleNewsFeeds } from "@/lib/domain/news";
import { READINGS_PER_DAY } from "@/lib/domain/plan-config";
import { isNewsStale, listArticles, readingsToday, refreshNews, unreadArticleCount, type NewsFilter } from "@/lib/services/news";
import { getSettings } from "@/lib/services/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News" };

const FILTERS: Array<{ id: NewsFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "full", label: "Full articles" },
  { id: "bookmarked", label: "Bookmarked" },
];

type Params = { cat?: string; src?: string; tag?: string; f?: NewsFilter };

const PICK_CATEGORIES = ["system-design", "engineering", "databases"] as const;

function href(current: Params, patch: Params): string {
  const next = { ...current, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1] && e[1] !== "all"));
  const s = qs.toString();
  return s ? `/news?${s}` : "/news";
}

function Pill({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={chipClass(active, "shrink-0")}
    >
      {children}
    </Link>
  );
}

function Strip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <nav aria-label={label} className={cn("scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:px-0", className)}>
      {children}
    </nav>
  );
}

function GoalCard({ readings, unread }: { readings: number; unread: number }) {
  const done = readings >= READINGS_PER_DAY;
  const left = Math.max(0, READINGS_PER_DAY - readings);
  const pct = Math.min(100, Math.round((readings / READINGS_PER_DAY) * 100));
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border bg-card p-3 sm:gap-4 sm:p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", done ? "bg-success/12 text-success" : "bg-primary/10 text-primary")}>
        <BookOpenCheck className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium">
            {done ? "Reading bonus done for today" : `Read ${left} more for today's bonus`}
          </p>
          <p className="tabular font-mono text-xs text-muted-foreground">
            {readings}/{READINGS_PER_DAY} read today
          </p>
        </div>
        <Progress
          value={pct}
          aria-label={`${readings} of ${READINGS_PER_DAY} readings today`}
          className={cn("h-1.5", done && "[&>[data-slot=progress-indicator]]:bg-success")}
        />
        <p className="text-xs text-muted-foreground">
          Opening an article in the reader counts.{" "}
          {unread > 0 && (
            <Link href="/news?f=unread" className="font-medium text-foreground underline-offset-2 hover:underline">
              {unread} unread
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const categoryIds = new Set(news.categories.map((c) => c.id));
  const settings = await getSettings();
  const keywordFeeds = googleNewsFeeds(settings.googleNewsQueries, news.googleNews.defaultQueries, news.googleNews.urlTemplate);

  const cat = one(sp.cat) && categoryIds.has(one(sp.cat)!) ? one(sp.cat) : undefined;
  const src = keywordFeeds.some((k) => k.id === one(sp.src)) ? one(sp.src) : undefined;
  const f = FILTERS.find((x) => x.id === one(sp.f))?.id ?? "all";
  const tag = ARTICLE_TAGS.some((t) => t.id === one(sp.tag)) ? one(sp.tag) : undefined;
  const current: Params = { cat, src, tag, f };
  const unfiltered = !cat && !src && !tag && f === "all";

  const [articles, pickPool, readings, unread, stale] = await Promise.all([
    listArticles({ category: cat, source: src, tag, filter: f, limit: 60 }),
    unfiltered ? listArticles({ categories: PICK_CATEGORIES, minMinutes: 5, limit: 40 }) : Promise.resolve([]),
    readingsToday(),
    unreadArticleCount(),
    isNewsStale(),
  ]);
  if (stale) after(() => refreshNews().catch((err) => console.warn("[news] background refresh failed:", err)));

  const now = new Date();
  const picks = diversify(pickPool, 2, 8);
  const pickIds = new Set(picks.map((p) => p.id));
  const list = articles.filter((a) => !pickIds.has(a.id));

  const tagName = ARTICLE_TAGS.find((t) => t.id === tag)?.label;
  const srcName = keywordFeeds.find((k) => k.id === src)?.name.replace(/^Google News · /, "");
  const moreActive = !!tag || !!src;
  const fetching = stale && unfiltered;

  return (
    <>
      <PageHeader
        title="News"
        icon={Newspaper}
        description="System design newsletters, big-tech engineering, AI labs and tech news, readable in full right here."
      >
        <RefreshNewsButton />
      </PageHeader>

      <GoalCard readings={readings} unread={unread} />

      <div className="space-y-3">
        <Strip label="Filter">
          <div role="group" aria-label="Read status" className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-0.5">
            {FILTERS.map((x) => (
              <Link
                key={x.id}
                href={href(current, { f: x.id })}
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
        </Strip>

        <Strip label="Categories">
          <Pill to={href(current, { cat: undefined, src: undefined })} active={!cat && !src}>
            All categories
          </Pill>
          {news.categories.map((c) => (
            <Pill key={c.id} to={href(current, { cat: c.id, src: undefined })} active={cat === c.id}>
              {c.name}
            </Pill>
          ))}
        </Strip>

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
              <Strip label="Topics" className="-mx-3 px-3 lg:mx-0 lg:px-0">
                {ARTICLE_TAGS.map((t) => (
                  <Pill key={t.id} to={href(current, { tag: tag === t.id ? undefined : t.id })} active={tag === t.id}>
                    {t.label}
                  </Pill>
                ))}
              </Strip>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Google News{" "}
                <Link href="/settings#news" className="font-normal tracking-normal normal-case underline-offset-2 hover:text-foreground hover:underline">
                  (edit keywords)
                </Link>
              </p>
              <Strip label="Google News keywords" className="-mx-3 px-3 lg:mx-0 lg:px-0">
                {keywordFeeds.map((k) => (
                  <Pill key={k.id} to={href(current, { src: src === k.id ? undefined : k.id, cat: undefined })} active={src === k.id}>
                    {k.name.replace(/^Google News · /, "")}
                  </Pill>
                ))}
              </Strip>
            </div>
          </div>
        </details>

        {!unfiltered && (
          <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <span className="text-muted-foreground">
              {list.length} article{list.length === 1 ? "" : "s"}
              {tagName && <> · topic <span className="text-foreground">{tagName}</span></>}
              {srcName && <> · keyword <span className="text-foreground">{srcName}</span></>}
            </span>
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href="/news" scroll={false}>
                <X /> Clear filters
              </Link>
            </Button>
          </div>
        )}
      </div>

      {picks.length > 0 && (
        <section aria-labelledby="picks" className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
            <h2 id="picks" className="font-semibold">
              System design picks
            </h2>
            <span className="text-xs text-muted-foreground">Full articles, 5+ min</span>
          </div>
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
            {picks.map((p) => (
              <Link
                key={p.id}
                href={`/news/${p.id}`}
                className={cn(
                  "group flex w-[15rem] shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:w-64",
                  p.read && "opacity-70",
                )}
              >
                {p.leadImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.leadImage} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[2/1] w-full border-b object-cover" />
                ) : (
                  <div className="flex aspect-[2/1] items-center justify-center border-b bg-muted/50">
                    <Newspaper className="size-6 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="truncate text-xs text-muted-foreground">{p.sourceName}</span>
                  <span className="line-clamp-3 text-sm leading-snug font-medium group-hover:text-primary">{p.title}</span>
                  <span className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> {p.readingMinutes} min read
                    {p.read && <span className="ml-auto">Read</span>}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Articles" className="mt-6">
        {unfiltered && list.length > 0 && (
          <h2 className="mb-3 font-semibold">
            Latest
          </h2>
        )}
        {list.length === 0 ? (
          <EmptyForFilter f={f} fetching={fetching} unfiltered={unfiltered} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => (
              <NewsCard key={a.id} readingsGoal={READINGS_PER_DAY} item={toCardItem(a, now)} />
            ))}
          </div>
        )}
      </section>

      <details className="group mt-10">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          Browse-only sources (no RSS)
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {news.browseOnly.map((b) => (
            <a
              key={b.url}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {b.name} <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
            </a>
          ))}
        </div>
      </details>
    </>
  );
}

function EmptyForFilter({ f, fetching, unfiltered }: { f: NewsFilter; fetching: boolean; unfiltered: boolean }) {
  if (fetching) {
    return (
      <EmptyState icon={Newspaper} title="Fetching the latest articles" action={<RefreshNewsButton label="Fetch now" />}>
        <p>Feeds are being pulled in the background. Reload in a few seconds, or fetch now.</p>
      </EmptyState>
    );
  }
  if (f === "unread") {
    return (
      <EmptyState
        icon={Inbox}
        title="All caught up"
        action={
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/news">Browse all articles</Link>
          </Button>
        }
      >
        <p>You&apos;ve read everything here. New articles arrive with the morning refresh.</p>
      </EmptyState>
    );
  }
  if (f === "bookmarked") {
    return (
      <EmptyState
        icon={Bookmark}
        title="No bookmarks yet"
        action={
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/news">Find something to save</Link>
          </Button>
        }
      >
        <p>Bookmark an article to keep it past the 30-day cleanup.</p>
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon={Newspaper}
      title="Nothing here yet"
      action={
        unfiltered ? (
          <RefreshNewsButton label="Fetch now" />
        ) : (
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/news">Clear filters</Link>
          </Button>
        )
      }
    >
      <p>{f === "full" ? "No full-text articles match this filter yet." : "No articles match this filter yet."}</p>
    </EmptyState>
  );
}
