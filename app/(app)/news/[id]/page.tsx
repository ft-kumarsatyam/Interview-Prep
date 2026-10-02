import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, FileText } from "lucide-react";
import { ArticleMarkdown } from "@/components/news/article-markdown";
import { ReaderActions } from "@/components/news/reader-actions";
import { news } from "@/lib/content";
import { tagLabel } from "@/lib/domain/article";
import { READINGS_PER_DAY } from "@/lib/domain/plan-config";
import { ensureArticleContent, getArticle, nextUnread } from "@/lib/services/news";

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
  let article = await getArticle(id);
  if (!article) notFound();
  if (article.contentStatus === null) {
    await ensureArticleContent(id);
    article = (await getArticle(id)) ?? article;
  }
  const next = await nextUnread(id, article.category);
  const published = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const host = hostOf(article.url);
  const hasBody = !!article.content && (article.contentStatus === "full" || article.contentStatus === "extracted");
  const showLead = hasBody && article.leadImage && !article.content!.includes(article.leadImage);

  return (
    <article className="mx-auto max-w-2xl pb-8">
      <Link href="/news" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> News
      </Link>

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
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/news?cat=${article.category}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
            {catName.get(article.category) ?? article.category}
          </Link>
          {article.tags.map((t) => (
            <Link key={t} href={`/news?tag=${t}`} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/15">
              {tagLabel.get(t) ?? t}
            </Link>
          ))}
        </div>
        <ReaderActions
          id={article.id}
          url={article.url}
          read={article.read}
          bookmarked={article.bookmarked}
          readingsGoal={READINGS_PER_DAY}
        />
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
        ) : (
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" aria-hidden />
              {article.contentStatus === "headline" ? "Headline only" : "Couldn't load the full article"}
            </div>
            <p className="text-sm text-muted-foreground">
              {article.contentStatus === "headline"
                ? "Google News links only resolve in a browser, so PrepOS can't show this one inline."
                : `${host} didn't let PrepOS read the page${article.contentError ? ` (${article.contentError})` : ""}.`}{" "}
              Use <span className="font-medium text-foreground">Open original</span> above.
            </p>
            {article.snippet && <p className="mt-4 border-l-2 pl-3 text-sm">{article.snippet}</p>}
          </div>
        )}
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
          Source: {host}
        </a>
        {next && (
          <Link href={`/news/${next.id}`} className="inline-flex max-w-full items-center gap-1 font-medium text-primary hover:underline">
            <span className="truncate">Next unread: {next.title}</span> <ArrowRight className="size-4 shrink-0" />
          </Link>
        )}
      </footer>
    </article>
  );
}
