"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** "⌘" on Apple devices, "Ctrl" elsewhere, for keyboard-shortcut hints. */
export function useModKey(): "⌘" | "Ctrl" {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "⌘",
  );
}
