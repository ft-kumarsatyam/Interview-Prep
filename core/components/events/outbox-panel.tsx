"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/shared/tone-badge";

export interface OutboxPanelProps {
  broker: "qstash" | "mongo";
  stats: { pending: number; published: number; dead: number; lagMs: number };
  replay: () => Promise<{ ok: true; replayed: number } | { ok: false; error: string }>;
}

const lagLabel = (ms: number) => (ms < 1000 ? "0s" : ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60_000)}m`);

/** Event delivery health: how far behind the outbox is, what failed for good, and a button to retry it. */
export function OutboxPanel({ broker, stats, replay }: OutboxPanelProps) {
  const [busy, start] = useTransition();
  const lagging = stats.lagMs > 5 * 60_000;
  return (
    <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Event delivery</h2>
        <ToneBadge tone="neutral">{broker === "qstash" ? "QStash queue" : "MongoDB polling"}</ToneBadge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Waiting</dt>
          <dd className="font-mono tabular-nums">{stats.pending}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">With the queue</dt>
          <dd className="font-mono tabular-nums">{stats.published}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Oldest wait</dt>
          <dd className={lagging ? "font-mono tabular-nums text-destructive" : "font-mono tabular-nums"}>{lagLabel(stats.lagMs)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dead-lettered</dt>
          <dd className={stats.dead ? "font-mono tabular-nums text-destructive" : "font-mono tabular-nums"}>{stats.dead}</dd>
        </div>
      </dl>
      {stats.dead > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">These gave up after several retries. Replaying sends them through again.</p>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await replay();
                if (r.ok) toast.success(`Replaying ${r.replayed} event${r.replayed === 1 ? "" : "s"}`);
                else toast.error(r.error);
              })
            }
          >
            Replay dead letters
          </Button>
        </div>
      )}
    </div>
  );
}
