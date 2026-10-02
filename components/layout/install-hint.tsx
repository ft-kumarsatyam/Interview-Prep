"use client";

import { useSyncExternalStore } from "react";
import { Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type InstallState = "unknown" | "installed" | "ios" | "promptable" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "prepos:install-hint-dismissed";
const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;

const emit = () => listeners.forEach((l) => l());

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", emit);
}

// Chrome fires beforeinstallprompt once, early; listen from module load so it isn't missed.
if (typeof window !== "undefined") startListening();

function subscribe(listener: () => void) {
  startListening();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function detect(): InstallState {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) return "installed";
  if (deferredPrompt) return "promptable";
  const ua = nav.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && nav.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

/** Whether PrepOS is running as an installed app, and how it can be installed if not. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, detect, () => "unknown");
}

const isDismissed = () => localStorage.getItem(DISMISS_KEY) === "1";

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
}

export function IosInstallSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      <li>
        Open PrepOS in <strong className="text-foreground">Safari</strong>.
      </li>
      <li>
        Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> Share in the toolbar.
      </li>
      <li>
        Choose <SquarePlus className="inline size-4 align-text-bottom" aria-hidden /> <strong className="text-foreground">Add to Home Screen</strong>, then Add.
      </li>
    </ol>
  );
}

/** Small banner on phones that aren't running the installed app yet. */
export function InstallHint() {
  const state = useInstallState();
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed || (state !== "ios" && state !== "promptable")) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    emit();
  };

  return (
    <div role="region" aria-label="Install PrepOS" className="mb-4 flex items-start gap-3 rounded-xl border bg-card p-3 text-sm lg:hidden">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <SquarePlus className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Install PrepOS as an app</p>
        {state === "ios" ? (
          <p className="text-muted-foreground">
            In Safari, tap <Share className="inline size-3.5 align-text-bottom" aria-label="Share" /> then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <Button size="sm" className="mt-2" onClick={() => void promptInstall()}>
            Install
          </Button>
        )}
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={dismiss} aria-label="Dismiss">
        <X className="size-4" />
      </Button>
    </div>
  );
}
