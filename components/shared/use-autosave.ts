"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export interface AutosaveOptions {
  delayMs?: number;
  enabled?: boolean;
}

/**
 * Debounced draft persistence for client editing surfaces.
 * The callback receives the newest value and must own validation/authenticated persistence.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => void | Promise<void>,
  { delayMs = 800, enabled = true }: AutosaveOptions = {},
): AutosaveState {
  const [state, setState] = useState<AutosaveState>("idle");
  const first = useRef(true);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const timer = window.setTimeout(() => {
      Promise.resolve(saveRef.current(value))
        .then(() => setState("saved"))
        .catch(() => setState("error"));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enabled, value]);

  return state;
}
