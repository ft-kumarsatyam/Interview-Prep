"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when every free AI provider is out of quota and the only one left costs money.
 * Nothing is sent to the paid provider until you choose "Use once" or "Allow today".
 */
export function PaidFallbackNotice({
  used,
  cap,
  busy,
  onUseOnce,
  onAllowToday,
  onCancel,
}: {
  used: number;
  cap: number;
  busy?: boolean;
  onUseOnce: () => void;
  onAllowToday: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>
          <span className="font-medium">The free AI providers are used up for now.</span> The only one left is a paid provider that bills your card. Use it for this request?{" "}
          <span className="text-muted-foreground">
            {used} of {cap} paid calls used today.
          </span>
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onUseOnce} disabled={busy}>
          Use once
        </Button>
        <Button size="sm" variant="outline" onClick={onAllowToday} disabled={busy}>
          Allow today
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
