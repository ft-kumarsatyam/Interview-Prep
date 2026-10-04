"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { decodeEvent, type LiveEvent, type LiveEventType } from "@/lib/domain/live-events";

type Handler = (e: LiveEvent) => void;
export type LiveStatus = "connecting" | "live" | "paused" | "polling";

const TYPES: LiveEventType[] = ["sync.progress", "sync.done", "jobs.new", "notification", "capture"];
/** Close the connection after this long hidden or without any interaction, so an idle tab costs nothing. */
const HIDDEN_CLOSE_MS = 20_000;
const IDLE_MS = 10 * 60_000;
const MAX_FAILURES = 5;
const POLL_MS = 60_000;

const Ctx = createContext<{ subscribe: (h: Handler) => () => void; status: LiveStatus }>({ subscribe: () => () => undefined, status: "paused" });
export const useLiveStatus = () => useContext(Ctx).status;

/**
 * One server-sent-events connection per tab. It opens only while the tab is visible and in use, backs
 * off after errors, and falls back to refreshing the page once a minute if events can't get through
 * (a proxy that buffers them, or an offline server). Consumers subscribe with `useLiveEvents`.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const handlers = useRef(new Set<Handler>());
  const [status, setStatus] = useState<LiveStatus>("connecting");

  const subscribe = useCallback((h: Handler) => {
    handlers.current.add(h);
    return () => void handlers.current.delete(h);
  }, []);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      // Old browser: no events, so the page refreshes itself instead. (Status is set from the timer, not synchronously.)
      const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), POLL_MS);
      const s = setTimeout(() => setStatus("polling"), 0);
      return () => (clearInterval(t), clearTimeout(s));
    }
    let es: EventSource | null = null;
    let failures = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let lastActivity = Date.now();
    let idle = false;
    let disposed = false;

    const emit = (e: LiveEvent) => handlers.current.forEach((h) => h(e));
    const close = () => {
      es?.close();
      es = null;
    };
    const startPolling = () => {
      setStatus("polling");
      poll ??= setInterval(() => document.visibilityState === "visible" && router.refresh(), POLL_MS);
    };
    const open = () => {
      if (disposed || es || idle || document.visibilityState !== "visible") return;
      if (failures >= MAX_FAILURES) return startPolling();
      es = new EventSource("/api/events");
      es.onopen = () => {
        failures = 0;
        setStatus("live");
      };
      for (const t of TYPES) {
        es.addEventListener(t, (m) => {
          const e = decodeEvent((m as MessageEvent<string>).data);
          if (e) emit(e);
        });
      }
      es.onerror = () => {
        // The server ends a connection about every 50 s and the browser reconnects by itself (readyState
        // CONNECTING). Only a closed connection (for example a 401) is a real failure.
        if (es && es.readyState === EventSource.CLOSED) {
          close();
          failures++;
          setStatus("connecting");
          retry = setTimeout(open, Math.min(60_000, 1000 * 2 ** failures));
        }
      };
    };
    const onVisibility = () => {
      clearTimeout(hiddenTimer);
      if (document.visibilityState === "visible") {
        setStatus((s) => (s === "polling" ? s : "connecting"));
        open();
      } else {
        hiddenTimer = setTimeout(() => {
          close();
          setStatus((s) => (s === "polling" ? s : "paused"));
        }, HIDDEN_CLOSE_MS);
      }
    };
    const onActivity = () => {
      lastActivity = Date.now();
      if (idle) {
        idle = false;
        open();
      }
    };
    const idleCheck = setInterval(() => {
      if (!idle && Date.now() - lastActivity > IDLE_MS) {
        idle = true;
        close();
        setStatus((s) => (s === "polling" ? s : "paused"));
      }
    }, 30_000);

    open();
    document.addEventListener("visibilitychange", onVisibility);
    for (const ev of ["pointerdown", "keydown", "scroll"]) window.addEventListener(ev, onActivity, { passive: true });
    return () => {
      disposed = true;
      close();
      clearTimeout(retry);
      clearTimeout(hiddenTimer);
      clearInterval(idleCheck);
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ev of ["pointerdown", "keydown", "scroll"]) window.removeEventListener(ev, onActivity);
    };
  }, [router]);

  const value = useMemo(() => ({ subscribe, status }), [subscribe, status]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Runs `handler` for each live event (optionally only some types) while the component is mounted. */
export function useLiveEvents(handler: Handler, types?: readonly LiveEventType[]) {
  const { subscribe } = useContext(Ctx);
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  const key = types?.join(",") ?? "";
  useEffect(() => subscribe((e) => (!key || key.split(",").includes(e.type)) && ref.current(e)), [subscribe, key]);
}
