"use client";

import { useSyncExternalStore } from "react";

/** True when the media query matches. Always false during SSR and the first client render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const noop = () => () => {};
/** False on the server and during hydration, true afterwards: gate anything that reads localStorage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(`prepos:${key}`);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(`prepos:${key}`);
    else window.localStorage.setItem(`prepos:${key}`, value);
  } catch {
    // Private mode or a full quota: drafts just won't persist.
  }
}

export const DESKTOP_QUERY = "(min-width: 1024px)";
export const SPLIT_QUERY = "(min-width: 768px)";
