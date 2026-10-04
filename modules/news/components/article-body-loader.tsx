"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, RotateCw } from "lucide-react";
import { loadArticleBodyAction, retryArticleBodyAction, type ArticleBodyResult } from "@/app/(app)/news/actions";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { Button } from "@/components/ui/button";

type State =
  | { phase: "loading" }
  | { phase: "ready"; markdown: string }
  | { phase: "headline" }
  | { phase: "failed"; error: string; waitSec?: number };

function toState(res: ArticleBodyResult): State {
  if (!res.ok) return { phase: "failed", error: res.error };
  if (res.status === "ready") return { phase: "ready", markdown: res.markdown };
  if (res.status === "headline") return { phase: "headline" };
  return { phase: "failed", error: res.error, ...(res.waitSec ? { waitSec: res.waitSec } : {}) };
}

/**
 * Article body fetched after the page paints: the feed snippet and a skeleton show while the
 * server extracts the page, then the markdown replaces them. A failure keeps the snippet and offers Retry.
 */
export function ArticleBodyLoader({
  id,
  snippet,
  url,
  host,
  initialError,
}: {
  id: string;
  snippet: string;
  url: string;
  host: string;
  /** Set when the server already knows the extraction failed; skips the automatic load. */
  initialError?: string | null;
}) {
  const [state, setState] = useState<State>(initialError !== undefined ? { phase: "failed", error: initialError || "The page could not be read" } : { phase: "loading" });
  const started = useRef(initialError !== undefined);

  const run = useCallback((action: (id: string) => Promise<ArticleBodyResult>) => {
    setState({ phase: "loading" });
    action(id).then(
      (res) => setState(toState(res)),
      () => setState({ phase: "failed", error: "Network error" }),
    );
  }, [id]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run(loadArticleBodyAction);
  }, [run]);

  if (state.phase === "ready") return <ArticleMarkdown markdown={state.markdown} />;

  const failed = state.phase === "failed";
  return (
    <div className="space-y-4" aria-busy={state.phase === "loading"}>
      {snippet && <p className="border-l-2 pl-3 text-sm">{snippet}</p>}
      {state.phase === "loading" && (
        <div role="status" aria-label="Loading the full article" className="space-y-3">
          {[100, 92, 96, 70, 100, 85].map((w, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      {(failed || state.phase === "headline") && (
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-muted-foreground" aria-hidden />
            {failed ? "Couldn't load the full article" : "Headline only"}
          </div>
          <p className="text-sm text-muted-foreground">
            {failed
              ? `${host} didn't let PrepOS read the page (${state.error})${state.waitSec ? `. Try again in ${state.waitSec}s.` : "."}`
              : "Google News links only resolve in a browser, so PrepOS can't show this one inline."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {failed && (
              <Button type="button" variant="outline" className="h-9" onClick={() => run(retryArticleBodyAction)}>
                <RotateCw aria-hidden /> Retry
              </Button>
            )}
            <Button asChild className="h-9">
              <a href={url} target="_blank" rel="noopener noreferrer">
                Read it on {host} <ExternalLink aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
