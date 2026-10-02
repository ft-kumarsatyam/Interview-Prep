"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshNewsAction } from "@/app/(app)/news/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshNewsButton({ label = "Refresh" }: { label?: string }) {
  const [pending, start] = useTransition();
  const onClick = () =>
    start(async () => {
      const res = await refreshNewsAction();
      if (!res.ok) toast.error(`${res.error}. Check your connection and try again in a minute.`);
      else if (res.fresh) toast.info("Already up to date. Feeds were refreshed in the last minute.");
      else if (res.inserted === 0) toast.info(`No new articles yet${res.failed ? ` · ${res.failed} feed${res.failed === 1 ? "" : "s"} unreachable` : ""}`);
      else toast.success(`${res.inserted} new article${res.inserted === 1 ? "" : "s"}${res.failed ? ` · ${res.failed} feed${res.failed === 1 ? "" : "s"} unreachable` : ""}`);
    });
  return (
    <Button variant="outline" className="h-9" onClick={onClick} disabled={pending} aria-busy={pending}>
      <RefreshCw className={cn(pending && "animate-spin")} aria-hidden /> {pending ? "Fetching feeds…" : label}
    </Button>
  );
}
