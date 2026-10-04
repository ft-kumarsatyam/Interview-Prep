"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLiveEvents } from "@/core/components/live/live-provider";

type BadgeNavigator = Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/**
 * What the installed app does with notifications while it is open: keeps the home-screen icon badge equal
 * to the unread count (a push that arrived while it was closed leaves a dot, cleared here), and shows a
 * toast when a new one arrives live. Renders nothing.
 */
export function NotificationEffects({ unread }: { unread: number }) {
  const router = useRouter();

  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    if (!nav.setAppBadge || !nav.clearAppBadge) return;
    (unread > 0 ? nav.setAppBadge(unread) : nav.clearAppBadge()).catch(() => undefined);
  }, [unread]);

  useLiveEvents(() => {
    toast("New notification", { action: { label: "View", onClick: () => router.push("/notifications") } });
  }, ["notification"]);

  return null;
}
