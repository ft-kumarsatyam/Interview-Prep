"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production builds only (dev would cache stale chunks). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err: unknown) => {
      console.warn("[pwa] service worker registration failed", err);
    });
  }, []);
  return null;
}
