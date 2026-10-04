"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { checkAcceptedAction } from "@/app/(app)/dsa/[slug]/actions";
import { Button } from "@/components/ui/button";

const POLL_MS = 30_000;
const WATCH_MS = 5 * 60_000;

/**
 * Copies your solution, opens the problem on LeetCode, then watches your public profile for the Accepted
 * submission (every 30 s for 5 minutes) so it can log the solve here. No login or cookie is involved.
 */
export function CopyAndOpen({ slug, url, getCode, onAccepted }: { slug: string; url: string; getCode: () => string; onAccepted: (date: string) => void }) {
  const [watching, setWatching] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const since = useRef(0);
  const busy = useRef(false);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setWatching(false);
  };
  useEffect(() => stop, []);

  async function check(manual = false) {
    if (busy.current) return;
    if (Date.now() - since.current > WATCH_MS && !manual) {
      stop();
      toast.message("Stopped watching LeetCode. Use Check now after you submit, or sync from the dashboard.");
      return;
    }
    busy.current = true;
    try {
      const res = await checkAcceptedAction({ slug, sinceMs: since.current });
      if (!res.ok) return void toast.error(res.error);
      const r = res.result;
      if (r.status === "accepted") {
        stop();
        toast.success("Accepted on LeetCode. Log how it went.");
        onAccepted(r.date);
      } else if (r.status === "disabled") {
        stop();
        toast.message("Add your LeetCode username in Settings so I can detect your submission.");
      } else if (r.status === "error") {
        if (manual) toast.error(r.message);
      } else if (manual) {
        toast.message(r.status === "wait" ? "Checked a moment ago. Try again in a few seconds." : "No new Accepted submission yet.");
      }
    } finally {
      busy.current = false;
    }
  }

  function start() {
    // Copy and open in the same click, before any await, so Safari doesn't block the new tab.
    const copying = navigator.clipboard?.writeText(getCode());
    window.open(url, "_blank", "noopener,noreferrer");
    copying?.then(
      () => toast.success("Solution copied. Paste it on LeetCode and submit."),
      () => toast.message("LeetCode opened, but the browser blocked copying. Copy your code from the editor."),
    );
    since.current = Date.now();
    stop();
    setWatching(true);
    timer.current = setInterval(() => void check(), POLL_MS);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" className="h-9" onClick={start} title="Copies your code, opens LeetCode, and detects your Accepted submission">
        <ExternalLink /> Copy code + open LeetCode
      </Button>
      {watching && (
        <span className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 py-0.5 pr-0.5 pl-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-primary" role="status">
            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden /> Watching for Accepted…
          </span>
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => void check(true)}>
            Check now
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={stop}>
            Stop
          </Button>
        </span>
      )}
    </span>
  );
}
