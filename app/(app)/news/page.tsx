import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Clock, Newspaper } from "lucide-react";
import { toCardItem } from "@/components/news/card-item";
import { NewsCard } from "@/components/news/news-card";
import { RefreshNewsButton } from "@/components/news/refresh-news-button";
import { EmptyState } from "@/components/shared/empty-state";
import { news } from "@/lib/content";
import { ARTICLE_TAGS, diversify } from "@/lib/domain/article";
import { googleNewsFeeds } from "@/lib/domain/news";
import { READINGS_PER_DAY } from "@/lib/domain/plan-config";
import { isNewsStale, listArticles, readingsToday, refreshNews, type NewsFilter } from "@/lib/services/news";
import { getSettings } from "@/lib/services/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News" };

const FILTERS: Array<{ id: NewsFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "full", label: "Full articles" },
  { id: "unread", label: "Unread" },
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
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted",
        active && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      {children}
    </Link>
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

  const [articles, pickPool, readings, stale] = await Promise.all([
    listArticles({ category: cat, source: src, tag, filter: f, limit: 60 }),
    unfiltered ? listArticles({ categories: PICK_CATEGORIES, minMinutes: 5, limit: 40 }) : Promise.resolve([]),
    readingsToday(),
    isNewsStale(),
  ]);
  if (stale) after(() => refreshNews().catch((err) => console.warn("[news] background refresh failed:", err)));

  const now = new Date();
  const picks = diversify(pickPool, 2, 8);
  const pickIds = new Set(picks.map((p) => p.id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">News</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System design newsletters, big-tech engineering, AI labs and tech news, readable in full right here. Read today:{" "}
            <span className={cn("font-medium", readings >= READINGS_PER_DAY ? "text-success" : "text-foreground")}>
              {readings}/{READINGS_PER_DAY}
            </span>
          </p>
        </div>
        <RefreshNewsButton />
      </div>

      <div className="space-y-3">
        <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <Pill to={href(current, { cat: undefined, src: undefined })} active={!cat && !src}>
            All
          </Pill>
          {news.categories.map((c) => (
            <Pill key={c.id} to={href(current, { cat: c.id, src: undefined })} active={cat === c.id}>
              {c.name}
            </Pill>
          ))}
        </nav>
        <nav aria-label="Topics" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">Topics</span>
          {ARTICLE_TAGS.map((t) => (
            <Pill key={t.id} to={href(current, { tag: tag === t.id ? undefined : t.id })} active={tag === t.id}>
              {t.label}
            </Pill>
          ))}
        </nav>
        <nav aria-label="Google News keywords" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">Google News</span>
          {keywordFeeds.map((k) => (
            <Pill key={k.id} to={href(current, { src: src === k.id ? undefined : k.id, cat: undefined })} active={src === k.id}>
              {k.name.replace(/^Google News · /, "")}
            </Pill>
          ))}
        </nav>
        <nav aria-label="Filter" className="flex gap-2">
          {FILTERS.map((x) => (
            <Pill key={x.id} to={href(current, { f: x.id })} active={f === x.id}>
              {x.label}
            </Pill>
          ))}
        </nav>
      </div>

      {picks.length > 0 && (
        <section aria-labelledby="picks" className="mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="picks" className="font-semibold">
              System design picks
            </h2>
            <span className="text-xs text-muted-foreground">Full articles, 5+ min, newest first</span>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
            {picks.map((p) => (
              <Link
                key={p.id}
                href={`/news/${p.id}`}
                className={cn(
                  "group flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50",
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
                  <span className="line-clamp-3 text-sm font-medium leading-snug group-hover:text-primary">{p.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> {p.readingMinutes} min read
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        {articles.length === 0 ? (
          <EmptyState icon={Newspaper} title={stale && f === "all" && !cat && !src ? "Fetching the latest articles" : "Nothing here"}>
            <p>
              {stale && f === "all" && !cat && !src
                ? "Feeds are being pulled in the background. Refresh in a few seconds, or fetch now."
                : f === "bookmarked"
                  ? "Bookmark an article to keep it past the 30-day cleanup."
                  : "No articles match this filter yet."}
            </p>
            <div className="mt-4">
              <RefreshNewsButton label="Fetch now" />
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {articles
              .filter((a) => !pickIds.has(a.id))
              .map((a) => (
                <NewsCard key={a.id} readingsGoal={READINGS_PER_DAY} item={toCardItem(a, now)} />
              ))}
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Browse-only sources (no RSS)</h2>
        <div className="flex flex-wrap gap-2">
          {news.browseOnly.map((b) => (
            <a key={b.url} href={b.url} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
              {b.name}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
