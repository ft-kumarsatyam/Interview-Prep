import { news } from "@/lib/content";
import { tagLabel } from "@/lib/domain/article";
import { timeAgo } from "@/lib/domain/news";
import type { ArticleItem } from "@/lib/services/news";
import type { NewsCardItem } from "./news-card";

const catName = new Map(news.categories.map((c) => [c.id, c.name]));

export function toCardItem(a: ArticleItem, now: Date): NewsCardItem {
  const fullText = a.contentStatus === "full" || a.contentStatus === "extracted";
  return {
    id: a.id,
    url: a.url,
    title: a.title,
    sourceName: a.sourceName,
    categoryName: catName.get(a.category) ?? a.category,
    age: a.publishedAt ? timeAgo(new Date(a.publishedAt), now) : null,
    snippet: a.snippet,
    summary: a.summary,
    read: a.read,
    bookmarked: a.bookmarked,
    readingMinutes: fullText ? a.readingMinutes : null,
    tags: a.tags.map((id) => ({ id, label: tagLabel.get(id) ?? id })),
  };
}
