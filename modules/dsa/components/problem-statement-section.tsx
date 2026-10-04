import { ExternalLink, FileWarning, Lightbulb } from "lucide-react";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeetCodeProblem } from "@/modules/dsa/services/lc-problems";

/** Loads lazily on first view and is then cached, so a slow or blocked LeetCode never delays the page. */
export async function ProblemStatement({ slug, url, plain, hideHints }: { slug: string; url: string; plain?: boolean; hideHints?: boolean }) {
  const p = await getLeetCodeProblem(slug);

  if (p.status !== "ok" || !p.contentMd) {
    const why =
      p.status === "premium"
        ? "This is a LeetCode Premium problem, so its statement can't be shown here."
        : p.status === "not_found"
          ? "LeetCode has no problem with this name."
          : "The statement couldn't be loaded from LeetCode right now. It will try again within the hour.";
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{why}</span>
          </p>
          <Button variant="outline" size="lg" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Read it on LeetCode <ExternalLink />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (plain) {
    return (
      <div className="space-y-4">
        {p.topicTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
            {p.topicTags.map((t) => (
              <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        )}
        <ArticleMarkdown markdown={p.contentMd} />
        {!hideHints && p.hints.map((h, i) => (
          <details key={i} className="rounded-lg border px-3 py-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">LeetCode hint {i + 1}</summary>
            <div className="pt-2">
              <ArticleMarkdown markdown={h} />
            </div>
          </details>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problem</CardTitle>
        {p.topicTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Topics">
            {p.topicTags.map((t) => (
              <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ArticleMarkdown markdown={p.contentMd} />
        {p.hints.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Lightbulb className="size-4 text-warning" aria-hidden /> LeetCode&apos;s hints ({p.hints.length})
            </h3>
            {p.hints.map((h, i) => (
              <details key={i} className="rounded-lg border px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Hint {i + 1}</summary>
                <div className="pt-2">
                  <ArticleMarkdown markdown={h} />
                </div>
              </details>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Fetched from LeetCode for your own study and cached here. It isn&apos;t stored in the project files.</p>
      </CardContent>
    </Card>
  );
}

export function ProblemStatementSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading the problem statement">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
