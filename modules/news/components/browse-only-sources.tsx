import { ChevronDown, ExternalLink } from "lucide-react";
import { news } from "@/core/content";

/** Collapsed list of sources that have no RSS feed. */
export function BrowseOnlySources() {
  return (
    <details className="group mt-10">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        Browse-only sources (no RSS)
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {news.browseOnly.map((b) => (
          <a
            key={b.url}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {b.name} <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
          </a>
        ))}
      </div>
    </details>
  );
}
