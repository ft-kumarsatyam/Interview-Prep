import Link from "next/link";
import { Newspaper } from "lucide-react";
import { toCardItem } from "@/modules/news/components/card-item";
import { NewsCard } from "@/modules/news/components/news-card";
import { isLongRead } from "@/modules/news/domain/article";
import { listArticles } from "@/modules/news/services/news";
import { READINGS_PER_DAY } from "@/modules/planner/domain/plan-config";

/** Async section: three unread articles, long reads first. Streams in behind Suspense. */
export async function NewsStrip() {
  const unread = await listArticles({ filter: "unread", limit: 30 });
  const latest = [...unread.filter((a) => isLongRead(a)), ...unread.filter((a) => !isLongRead(a))].slice(0, 3);
  if (latest.length === 0) return null;
  const now = new Date();
  return (
    <section aria-labelledby="news-strip">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="news-strip" className="flex items-center gap-2 font-medium">
          <Newspaper className="size-4 text-primary" /> AI &amp; engineering news
        </h2>
        <Link href="/news" className="text-sm text-muted-foreground hover:text-primary">
          All news →
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {latest.map((a) => (
          <NewsCard key={a.id} readingsGoal={READINGS_PER_DAY} item={toCardItem(a, now)} />
        ))}
      </div>
    </section>
  );
}
