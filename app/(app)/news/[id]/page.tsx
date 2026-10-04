import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, FileText, Newspaper } from "lucide-react";
import { LinkCard } from "@/components/shared/link-card";
import { ArticleBodyLoader } from "@/modules/news/components/article-body-loader";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { ReaderActions } from "@/modules/news/components/reader-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { news } from "@/core/content";
import { tagLabel } from "@/modules/news/domain/article";
import { READINGS_PER_DAY } from "@/modules/planner/domain/plan-config";
import { getArticle, nextUnread } from "@/modules/news/services/news";

const ID = /^[a-f0-9]{24}$/;
const catName = new Map(news.categories.map((c) => [c.id, c.name]));

export async function generateMetadata({ params }: PageProps<"/news/[id]">): Promise<Metadata> {
  const { id } = await params;
  const a = ID.test(id) ? await getArticle(id) : null;
  return { title: a ? a.title : "Article" };
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export default async function ArticlePage({ params }: PageProps<"/news/[id]">) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  // Render straight away: a body that isn't stored yet is loaded by <ArticleBodyLoader> after paint.
  const article = await getArticle(id);
  if (!article) notFound();
  const next = await nextUnread(id, article.category);
  const published = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const host = hostOf(article.url);
  const hasBody = !!article.content && (article.contentStatus === "full" || article.contentStatus === "extracted");
  const showLead = hasBody && article.leadImage && !article.content!.includes(article.leadImage);

  return (
    <article className="mx-auto max-w-2xl pb-8">
      <ReaderActions id={article.id} url={article.url} read={article.read} bookmarked={article.bookmarked} readingsGoal={READINGS_PER_DAY} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://icons.duckduckgo.com/ip3/${host}.ico`} alt="" width={16} height={16} className="size-4 rounded-sm" />
          <span className="font-medium text-foreground/80">{article.sourceName}</span>
          {published && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={article.publishedAt!}>{published}</time>
            </>
          )}
          {hasBody && article.readingMinutes && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> {article.readingMinutes} min read
              </span>
            </>
          )}
        </div>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/news?cat=${article.category}`}
            className="inline-flex h-7 items-center rounded-full border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {catName.get(article.category) ?? article.category}
          </Link>
          {article.tags.map((t) => (
            <Link
              key={t}
              href={`/news?tag=${t}`}
              className="inline-flex h-7 items-center rounded-full bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {tagLabel.get(t) ?? t}
            </Link>
          ))}
        </div>
      </header>

      {showLead && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.leadImage!}
          alt=""
          className="mt-6 aspect-video w-full rounded-xl border object-cover"
          referrerPolicy="no-referrer"
        />
      )}

      <div className="mt-6">
        {hasBody ? (
          <ArticleMarkdown markdown={article.content!} />
        ) : article.contentStatus === "headline" ? (
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" aria-hidden />
              Headline only
            </div>
            <p className="text-sm text-muted-foreground">Google News links only resolve in a browser, so PrepOS can&apos;t show this one inline.</p>
            {article.snippet && <p className="mt-4 border-l-2 pl-3 text-sm">{article.snippet}</p>}
            <Button asChild className="mt-4 h-9">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                Read it on {host} <ExternalLink aria-hidden />
              </a>
            </Button>
          </div>
        ) : (
          <ArticleBodyLoader
            id={article.id}
            snippet={article.snippet}
            url={article.url}
            host={host}
            {...(article.contentStatus === "failed" ? { initialError: article.contentError ?? "" } : {})}
          />
        )}
      </div>

      <footer className="mt-10 space-y-4 border-t pt-6">
        {next ? (
          <LinkCard href={`/news/${next.id}`} className="p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Up next · unread in {catName.get(article.category) ?? "this category"}</p>
              <p className="mt-1 line-clamp-2 leading-snug font-medium group-hover:text-primary">{next.title}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
          </LinkCard>
        ) : (
          <EmptyState compact icon={CheckCircle2} title={`You're caught up on ${catName.get(article.category) ?? "this category"}.`} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Button asChild variant="outline" className="h-9">
            <Link href="/news?f=unread">
              <Newspaper aria-hidden /> All unread news
            </Link>
          </Button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Source: {host} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </footer>
    </article>
  );
}
