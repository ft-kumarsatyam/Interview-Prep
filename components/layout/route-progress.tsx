"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Navigations faster than this never show the bar, so instant pages don't flicker. */
const SHOW_AFTER_MS = 120;
/** If a navigation never lands (aborted, same-URL redirect), stop rather than hang forever. */
const GIVE_UP_MS = 15_000;

type Timers = { show?: number; trickle?: number; giveUp?: number; hide?: number };

/**
 * Thin bar pinned to the top of the viewport while a route is loading.
 * Starts on any same-origin link click or back/forward, finishes when the URL commits.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const barRef = useRef<HTMLDivElement>(null);
  const currentUrl = useRef("");
  const controls = useRef<{ start: () => void; finish: () => void } | null>(null);

  useEffect(() => {
    const timers: Timers = {};
    let active = false;
    let value = 0;

    const paint = (next: number, visible: boolean) => {
      value = next;
      const el = barRef.current;
      if (!el) return;
      el.style.transform = `scaleX(${next})`;
      el.dataset.state = visible ? "on" : "off";
    };
    const clear = () => {
      window.clearTimeout(timers.show);
      window.clearInterval(timers.trickle);
      window.clearTimeout(timers.giveUp);
      window.clearTimeout(timers.hide);
      timers.show = timers.trickle = timers.giveUp = timers.hide = undefined;
    };

    const finish = () => {
      if (!active) return;
      active = false;
      const shown = timers.trickle !== undefined;
      clear();
      if (!shown) return paint(0, false);
      paint(1, true);
      timers.hide = window.setTimeout(() => paint(1, false), 250);
    };

    const start = () => {
      if (active) return;
      active = true;
      clear();
      paint(0, false);
      timers.show = window.setTimeout(() => {
        paint(0.2, true);
        timers.trickle = window.setInterval(() => paint(value + (0.9 - value) * 0.08, true), 250);
      }, SHOW_AFTER_MS);
      timers.giveUp = window.setTimeout(finish, GIVE_UP_MS);
    };

    const isNewUrl = (url: URL) => url.origin === window.location.origin && url.pathname + url.search !== currentUrl.current;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a") : null;
      if (!link?.href || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      if (isNewUrl(new URL(link.href))) start();
    };
    const onPopState = () => {
      if (isNewUrl(new URL(window.location.href))) start();
    };

    controls.current = { start, finish };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      clear();
      controls.current = null;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    currentUrl.current = search ? `${pathname}?${search}` : pathname;
    controls.current?.finish();
  }, [pathname, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[60] h-0.5">
      <div
        ref={barRef}
        data-state="off"
        style={{ transform: "scaleX(0)" }}
        className="h-full origin-left bg-primary opacity-0 shadow-[0_0_10px_var(--primary)] transition-[transform,opacity] duration-300 ease-out data-[state=on]:opacity-100"
      />
    </div>
  );
}
