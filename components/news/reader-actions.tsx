"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { Bookmark, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { bookmarkAction, markReadAction } from "@/app/(app)/news/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Opening the reader counts as reading the article (once, toward today's readings). */
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
  const marked = useRef(read);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    markReadAction(id).then((res) => {
      if (res.ok && res.readings === readingsGoal) toast.success(`Read ${readingsGoal} today. Bonus done.`);
    });
  }, [id, readingsGoal]);

  const onBookmark = () =>
    start(async () => {
      setSaved(!saved);
      const res = await bookmarkAction({ id, bookmarked: !saved });
      if (!res.ok) toast.error(res.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open original <ExternalLink />
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={onBookmark} aria-pressed={saved}>
        <Bookmark className={cn(saved && "fill-primary text-primary")} />
        {saved ? "Bookmarked" : "Bookmark"}
      </Button>
    </div>
  );
}
