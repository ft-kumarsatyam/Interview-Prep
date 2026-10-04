"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLiveEvents } from "@/components/live/live-provider";
import type { LiveEventType } from "@/lib/domain/live-events";

/**
 * Re-renders the current page's server data when one of these events arrives (the bell badge, a job
 * captured in another tab). Bursts are collapsed: at most one refresh per `gapMs`. Renders nothing.
 */
export function LiveRefresh({ types, gapMs = 4000 }: { types: readonly LiveEventType[]; gapMs?: number }) {
  const router = useRouter();
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useLiveEvents(() => {
    clearTimeout(timer.current);
    const wait = Math.max(0, last.current + gapMs - Date.now());
    timer.current = setTimeout(() => {
      last.current = Date.now();
      router.refresh();
    }, wait);
  }, types);
  return null;
}
