import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ExternalLink, PenLine } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { engineeringBlogs, news } from "@/core/content";
import { ArticleGrid } from "@/modules/news/components/article-grid";
import { isNewsStale, listArticles, refreshNews } from "@/modules/news/services/news";

export const metadata: Metadata = { title: "Engineering blogs" };

/** Each topic reads its own feed categories and shows its own slice of the directory (by tag). */
const TOPICS = {
  "system-design": { label: "System design", categories: ["engineering", "system-design"], hint: "How real companies build real systems." },
  frontend: { label: "Frontend", categories: ["frontend", "javascript"], hint: "React, the web platform, CSS and performance." },
  ai: { label: "AI and LLMs", categories: ["ai-eng", "ai-labs", "ai-news"], hint: "How LLMs work, RAG, agents and evals, from people who build them." },
} as const;
type Topic = keyof typeof TOPICS;
const TOPIC_IDS = Object.keys(TOPICS) as Topic[];
const blogTopic = (tags: readonly string[]): Topic => (tags.includes("frontend") ? "frontend" : tags.includes("ai") ? "ai" : "system-design");

const chip = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11 ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`;

const href = (topic: Topic, src?: string, tag?: string) => {
  const q = new URLSearchParams();
  if (topic !== "system-design") q.set("topic", topic);
  if (src) q.set("src", src);
  if (tag) q.set("tag", tag);
  const s = q.toString();
  return s ? `/blogs?${s}` : "/blogs";
};

export default async function BlogsPage({ searchParams }: PageProps<"/blogs">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const topic: Topic = TOPIC_IDS.includes(one(sp.topic) as Topic) ? (one(sp.topic) as Topic) : "system-design";
  const categories: readonly string[] = TOPICS[topic].categories;
  const sources = news.feeds.filter((f) => categories.includes(f.category));
  const src = sources.some((s) => s.id === one(sp.src)) ? one(sp.src) : undefined;
  const topicBlogs = engineeringBlogs.filter((b) => blogTopic(b.tags) === topic);
  const allTags = [...new Set(topicBlogs.flatMap((b) => b.tags))].filter((t) => t !== topic).toSorted();
  const tag = allTags.includes(one(sp.tag) ?? "") ? one(sp.tag) : undefined;

  const [articles, stale] = await Promise.all([
    listArticles(src ? { source: src, limit: 24 } : { categories, limit: 24 }),
    isNewsStale(),
  ]);
  if (stale) after(() => refreshNews().catch((err) => console.warn("[news] background refresh failed:", err)));
  const blogs = tag ? topicBlogs.filter((b) => b.tags.includes(tag)) : topicBlogs;

  return (
    <>
      <PageHeader icon={PenLine} title="Engineering blogs" description="System design, frontend and AI engineering writing from the people who build it. The latest posts open right here in the reader, so you never leave the app. The directory below lists every blog worth following." />
      <nav aria-label="Topic" className="mb-6 flex flex-wrap gap-1.5">
        {TOPIC_IDS.map((t) => (
          <Link key={t} href={href(t)} className={chipClass(topic === t)} aria-current={topic === t ? "true" : undefined}>
            {TOPICS[t].label}
          </Link>
        ))}
      </nav>

      <section aria-label="Latest posts" className="space-y-3">
        <SectionHeading title="Latest, read here" hint={`${TOPICS[topic].hint} Filter by source.`} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Source">
          <Link href={href(topic, undefined, tag)} className={chip(!src)} aria-current={!src ? "true" : undefined}>All sources</Link>
          {sources.map((s) => (
            <Link key={s.id} href={href(topic, s.id, tag)} className={chip(src === s.id)} aria-current={src === s.id ? "true" : undefined}>
              {s.name}
            </Link>
          ))}
        </div>
        <ArticleGrid articles={articles} showHeading={false} now={new Date()} empty={<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No posts yet. The feeds refresh in the background; reload in a minute.</p>} />
      </section>

      <section aria-label="Directory" className="mt-10 space-y-3">
        <SectionHeading title={`Blog directory (${blogs.length})`} hint="Hand-picked and checked. These open on the publisher's site." />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topic">
          <Link href={href(topic, src)} className={chip(!tag)} aria-current={!tag ? "true" : undefined}>All tags</Link>
          {allTags.map((t) => (
            <Link key={t} href={href(topic, src, t)} className={chip(tag === t)} aria-current={tag === t ? "true" : undefined}>
              {t}
            </Link>
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {blogs.map((b) => (
            <li key={b.url}>
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {b.name}
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {b.tags.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                  ))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
