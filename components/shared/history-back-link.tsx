"use client";

import Link from "next/link";
import { patchQuery, stepsBackTo } from "@/core/domain/history-back";

interface NavigationLike {
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
}

/**
 * A back link that returns to the history entry you came from when that page is behind you in this tab, so its tab,
 * filters and scroll come back exactly. Otherwise (a fresh tab, a shared link) it opens `href` like a normal link.
 */
export function HistoryBackLink({ href, onClick, ...props }: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
        const index = navigation?.currentEntry?.index ?? -1;
        if (!navigation || index < 0) return;
        const steps = stepsBackTo(navigation.entries().map((entry) => entry.url), index, href, window.location.origin);
        if (!steps) return;
        event.preventDefault();
        window.history.go(-steps);
      }}
    />
  );
}

/** Updates the current URL's query in place (no new history entry), so going back to this page restores the view. */
export function replaceQuery(patch: Record<string, string | readonly string[] | null | undefined>) {
  const qs = patchQuery(window.location.search, patch);
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}
