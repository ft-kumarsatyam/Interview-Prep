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
      if (!res.ok) toast.error(res.error);
      else if (res.fresh) toast.info("Already refreshed in the last minute");
      else toast.success(`${res.inserted} new article${res.inserted === 1 ? "" : "s"}${res.failed ? ` · ${res.failed} feed${res.failed === 1 ? "" : "s"} unreachable` : ""}`);
    });
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <RefreshCw className={cn(pending && "animate-spin")} /> {pending ? "Fetching feeds…" : label}
    </Button>
  );
}
