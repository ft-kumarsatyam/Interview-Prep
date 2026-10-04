"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markNotificationsReadAction } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => markNotificationsReadAction())}>
      <CheckCheck /> Mark all read
    </Button>
  );
}
