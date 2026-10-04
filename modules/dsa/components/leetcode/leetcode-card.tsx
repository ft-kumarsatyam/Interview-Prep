"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PenLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncLeetCodeNow } from "@/app/(app)/dashboard/actions";
import { SolveSheet, type SolveTarget } from "@/modules/progress/components/solve-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LeetCodeCard({
  username,
  lastSyncLabel,
  needsDetails,
  compact,
}: {
  username: string | null;
  /** Pre-formatted in APP_TIMEZONE on the server to avoid hydration mismatches. */
  lastSyncLabel: string | null;
  needsDetails: Array<{ slug: string; title: string; lastSolvedOn: string }>;
  /** Just the sync button with its status, for when nothing needs attention. */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<SolveTarget | null>(null);

  function sync() {
    startTransition(async () => {
      const res = await syncLeetCodeNow();
      if (res.ok) toast.success(res.message);
      else toast.error(`${res.error}.`);
    });
  }

  if (compact && username)
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={sync}
        disabled={pending}
        className="text-muted-foreground"
        title={`@${username} · ${lastSyncLabel ? `synced ${lastSyncLabel}` : "never synced"}`}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        <span className="hidden sm:inline">{lastSyncLabel ? `LeetCode · ${lastSyncLabel}` : "Sync LeetCode"}</span>
      </Button>
    );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>LeetCode sync</CardTitle>
          <CardDescription>
            {username ? (
              <>
                @{username} · {lastSyncLabel ? `synced ${lastSyncLabel}` : "never synced"}
              </>
            ) : (
              <>
                Not connected. <Link href="/settings" className="text-primary hover:underline">Add your username</Link> to auto-tick solves.
              </>
            )}
          </CardDescription>
        </div>
        {username && (
          <Button size="sm" variant="outline" onClick={sync} disabled={pending}>
            <RefreshCw className={pending ? "animate-spin" : undefined} /> Sync now
          </Button>
        )}
      </CardHeader>
      {needsDetails.length > 0 && (
        <CardContent>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Fill in details ({needsDetails.length})</p>
          <ul className="divide-y">
            {needsDetails.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 py-2 text-sm">
                <Link href={`/dsa/${p.slug}`} className="min-w-0 flex-1 truncate hover:text-primary">
                  {p.title}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{p.lastSolvedOn}</span>
                <Button size="xs" variant="secondary" onClick={() => setTarget({ slug: p.slug, title: p.title, date: p.lastSolvedOn })}>
                  <PenLine /> Rate
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
      <SolveSheet target={target} onOpenChange={(o) => !o && setTarget(null)} />
    </Card>
  );
}
