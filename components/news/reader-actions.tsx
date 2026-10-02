"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bookmark, BookOpenCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { bookmarkAction, markReadAction } from "@/app/(app)/news/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky reader bar. Opening the reader counts as reading the article (once, toward today's readings).
 */
export function ReaderActions({
  id,
  url,
  read,
  bookmarked,
  readingsGoal,
}: {
  id: string;
  url: string;
  read: boolean;
  bookmarked: boolean;
  readingsGoal: number;
}) {
  const [, start] = useTransition();
  const [saved, setSaved] = useOptimistic(bookmarked);
  const [readings, setReadings] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const marked = useRef(read);
  const host = new URL(url).hostname.replace(/^www\./, "");

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    markReadAction(id).then((res) => {
      if (!res.ok) return;
      setReadings(res.readings);
      if (res.readings === readingsGoal) toast.success(`Read ${readingsGoal} today. Bonus done.`);
    });
  }, [id, readingsGoal]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const onBookmark = () =>
    start(async () => {
      const next = !saved;
      setSaved(next);
      const res = await bookmarkAction({ id, bookmarked: next });
      if (!res.ok) toast.error(`${res.error}. Reload the page and try again.`);
      else if (next) toast.success("Bookmarked. It stays past the 30-day cleanup.");
    });

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-5 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-12 items-center gap-1">
        <Button asChild variant="ghost" className="-ml-2 h-9 px-2">
          <Link href="/news">
            <ArrowLeft aria-hidden /> News
          </Link>
        </Button>
        <p className="ml-1 hidden min-w-0 truncate text-xs text-muted-foreground sm:block" role="status">
          {readings !== null ? (
            <span className="inline-flex items-center gap-1">
              <BookOpenCheck className="size-3.5 text-success" aria-hidden /> Counted · {Math.min(readings, readingsGoal)}/{readingsGoal} today
            </span>
          ) : read ? (
            "Already read"
          ) : null}
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            className="h-9 px-2.5"
            onClick={onBookmark}
            aria-pressed={saved}
            aria-label={saved ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={cn(saved && "fill-primary text-primary")} aria-hidden />
            <span className="hidden sm:inline">{saved ? "Bookmarked" : "Bookmark"}</span>
          </Button>
          <Button asChild className="h-9">
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open original on ${host} in a new tab`}>
              <span className="sm:hidden">Original</span>
              <span className="hidden sm:inline">Open original</span>
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </div>
      <div className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} aria-hidden />
    </div>
  );
}
