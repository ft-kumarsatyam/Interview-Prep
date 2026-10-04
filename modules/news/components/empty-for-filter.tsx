import Link from "next/link";
import { Bookmark, Inbox, Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { RefreshNewsButton } from "@/modules/news/components/refresh-news-button";
import type { NewsFilter } from "@/modules/news/services/news";

export function EmptyForFilter({ f, fetching, unfiltered }: { f: NewsFilter; fetching: boolean; unfiltered: boolean }) {
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
