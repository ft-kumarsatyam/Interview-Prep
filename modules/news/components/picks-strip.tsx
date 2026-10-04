import Link from "next/link";
import { Clock, Newspaper } from "lucide-react";
import { cn } from "@/core/utils";
import type { ArticleItem } from "@/modules/news/services/news";

/** Horizontal strip of long-form system design picks. */
export function PicksStrip({ picks }: { picks: ArticleItem[] }) {
  if (picks.length === 0) return null;
  return (
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
  );
}
