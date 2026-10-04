import type { Metadata } from "next";
import { after } from "next/server";
import { Newspaper } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { news } from "@/core/content";
import { ARTICLE_TAGS, diversify } from "@/modules/news/domain/article";
import { googleNewsFeeds } from "@/modules/news/domain/news";
import { ArticleGrid } from "@/modules/news/components/article-grid";
import { BrowseOnlySources } from "@/modules/news/components/browse-only-sources";
import { EmptyForFilter } from "@/modules/news/components/empty-for-filter";
import { NEWS_FILTERS, NewsFilters } from "@/modules/news/components/news-filters";
import type { NewsParams } from "@/modules/news/components/news-url";
import { PicksStrip } from "@/modules/news/components/picks-strip";
import { ReadingGoalCard } from "@/modules/news/components/reading-goal-card";
import { RefreshNewsButton } from "@/modules/news/components/refresh-news-button";
import { isNewsStale, listArticles, readingsToday, refreshNews, unreadArticleCount } from "@/modules/news/services/news";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "News" };

const PICK_CATEGORIES = ["system-design", "engineering", "databases"] as const;

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const categoryIds = new Set(news.categories.map((c) => c.id));
  const settings = await getSettings();
  const keywordFeeds = googleNewsFeeds(settings.googleNewsQueries, news.googleNews.defaultQueries, news.googleNews.urlTemplate);

  const cat = one(sp.cat) && categoryIds.has(one(sp.cat)!) ? one(sp.cat) : undefined;
  const src = keywordFeeds.some((k) => k.id === one(sp.src)) ? one(sp.src) : undefined;
  const f = NEWS_FILTERS.find((x) => x.id === one(sp.f))?.id ?? "all";
  const tag = ARTICLE_TAGS.some((t) => t.id === one(sp.tag)) ? one(sp.tag) : undefined;
  const current: NewsParams = { cat, src, tag, f };
  const unfiltered = !cat && !src && !tag && f === "all";

  const [articles, pickPool, readings, unread, stale] = await Promise.all([
    listArticles({ category: cat, source: src, tag, filter: f, limit: 60 }),
    unfiltered ? listArticles({ categories: PICK_CATEGORIES, minMinutes: 5, limit: 40 }) : Promise.resolve([]),
    readingsToday(),
    unreadArticleCount(),
    isNewsStale(),
  ]);
  if (stale) after(() => refreshNews().catch((err) => console.warn("[news] background refresh failed:", err)));

  const picks = diversify(pickPool, 2, 8);
  const pickIds = new Set(picks.map((p) => p.id));
  const list = articles.filter((a) => !pickIds.has(a.id));

  return (
    <>
      <PageHeader title="News" icon={Newspaper} description="System design newsletters, big-tech engineering, AI labs and tech news, readable in full right here.">
        <RefreshNewsButton />
      </PageHeader>

      <ReadingGoalCard readings={readings} unread={unread} />
      <NewsFilters current={current} unread={unread} keywordFeeds={keywordFeeds} articleCount={list.length} />
      <PicksStrip picks={picks} />
      <ArticleGrid
        articles={list}
        showHeading={unfiltered && list.length > 0}
        now={new Date()}
        empty={<EmptyForFilter f={f} fetching={stale && unfiltered} unfiltered={unfiltered} />}
      />
      <BrowseOnlySources />
    </>
  );
}
