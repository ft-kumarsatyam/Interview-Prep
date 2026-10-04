import { LinkCard } from "@/components/shared/link-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/core/utils";

export function ArticleSection({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 scroll-mt-20 space-y-3", className)}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BulletList({ items, mono }: { items: string[]; mono?: boolean }) {
  if (mono) {
    return (
      <ul className="space-y-1.5 font-mono text-[13px]">
        {items.map((x) => (
          <li key={x} className="rounded-md bg-muted/50 px-2.5 py-1.5 [overflow-wrap:anywhere]">
            {x}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ReadingList({ readings, className }: { readings: Array<{ title: string; url: string }>; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {readings.map((r) => (
        <li key={r.url} className="min-w-0">
          <LinkCard external href={r.url} className="min-h-11 items-start gap-2 rounded-lg text-sm">
            <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="font-medium group-hover:text-primary">{r.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{hostname(r.url)}</span>
            </span>
          </LinkCard>
        </li>
      ))}
    </ul>
  );
}

export function RelatedNews({ items }: { items: Array<{ id: string; title: string; sourceName: string; readingMinutes?: number | null; read?: boolean }> }) {
  if (items.length === 0) {
    return (
      <EmptyState compact icon={Newspaper} title="No matching articles in the last 30 days.">
        They show up here once the morning job pulls engineering posts on this topic.
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="min-w-0">
          <LinkCard href={`/news/${a.id}`} className="min-h-11 items-start gap-2 rounded-lg text-sm">
            <Newspaper className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="line-clamp-2 font-medium group-hover:text-primary">{a.title}</span>
              <span className="block text-xs text-muted-foreground">
                {a.sourceName}
                {a.readingMinutes ? ` · ${a.readingMinutes} min` : ""}
                {a.read ? " · read" : ""}
              </span>
            </span>
          </LinkCard>
        </li>
      ))}
    </ul>
  );
}
