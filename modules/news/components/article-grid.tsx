import type { ReactNode } from "react";
import { NewsCard } from "@/modules/news/components/news-card";
import { toCardItem } from "@/modules/news/components/card-item";
import { READINGS_PER_DAY } from "@/modules/planner/domain/plan-config";
import type { ArticleItem } from "@/modules/news/services/news";

type Props = { articles: ArticleItem[]; showHeading: boolean; empty: ReactNode; now: Date };

/** The "Latest" section: heading, card grid or the empty state. */
export function ArticleGrid({ articles, showHeading, empty, now }: Props) {
  return (
    <section aria-label="Articles" className="mt-6">
      {showHeading && <h2 className="mb-3 font-semibold">Latest</h2>}
      {articles.length === 0 ? (
        empty
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((a) => (
            <NewsCard key={a.id} readingsGoal={READINGS_PER_DAY} item={toCardItem(a, now)} />
          ))}
        </div>
      )}
    </section>
  );
}
