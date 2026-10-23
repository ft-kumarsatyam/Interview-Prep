"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type PyRun = typeof import("@/core/sandbox/py-run");

/**
 * Python boot progress. The Python runtime is only imported once `enabled` is true (a Python tab is open), and
 * booting starts right away so the first Run is not the one that waits.
 */
export function usePyStatus(enabled: boolean): { loading: boolean; stage: string } {
  const [api, setApi] = useState<PyRun | null>(null);

  useEffect(() => {
    if (!enabled || api) return;
    let live = true;
    void import("@/core/sandbox/py-run").then((m) => {
      if (!live) return;
      setApi(m);
      m.bootPython().catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [enabled, api]);

  const subscribe = useCallback((cb: () => void) => (api ? api.subscribePyStatus(cb) : () => {}), [api]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (api && api.pyStatus() === "loading" ? `loading:${api.pyStage()}` : "idle"),
    () => "idle",
  );
  return snapshot.startsWith("loading") ? { loading: true, stage: snapshot.slice(8) || "Loading Python" } : { loading: false, stage: "" };
}
