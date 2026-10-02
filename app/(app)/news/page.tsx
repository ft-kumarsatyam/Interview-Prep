import type { Metadata } from "next";
import { ExternalLink, Rss, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { news } from "@/lib/content";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="News"
        description="Sources the daily refresh pulls from. The live feed reader (auto-updated every morning) arrives in Phase 6."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-4 text-primary" /> Google News keyword feeds
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {news.googleNews.defaultQueries.map((q) => (
              <a
                key={q.id}
                href={`https://news.google.com/search?q=${encodeURIComponent(q.query)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
              >
                {q.query.replaceAll('"', "")}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {news.categories.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rss className="size-4 text-primary" /> {c.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {news.feeds
                    .filter((f) => f.category === c.id)
                    .map((f) => (
                      <li key={f.id}>
                        <a href={new URL(f.url).origin} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                          {f.name}
                        </a>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Browse-only (no RSS)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {news.browseOnly.map((b) => (
                  <li key={b.url}>
                    <a href={b.url} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                      {b.name}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
