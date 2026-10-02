"use client";

import { toast } from "sonner";

/** Confetti once per day when the day flips to complete. Respects reduced motion. */
export async function celebrateDayComplete(): Promise<void> {
  toast.success("Day complete! Streak extended 🔥");
  const key = `prepos:confetti:${new Date().toDateString()}`;
  if (typeof window === "undefined" || localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
}
