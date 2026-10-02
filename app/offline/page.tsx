import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page can't be reached. Must not touch the DB or session. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 pt-[env(safe-area-inset-top)] text-center">
      <div className="max-w-sm space-y-4">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
          <WifiOff className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          PrepOS needs a connection to load your plan, progress and quizzes. Reconnect and try again.
        </p>
        {/* A plain link forces a full navigation, so the service worker retries the network. */}
        <a href="/dashboard" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Try again
        </a>
      </div>
    </main>
  );
}
