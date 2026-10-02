"use client";

import { useTransition } from "react";
import { Bell, CalendarCheck, CheckCheck, Flame, RefreshCw, Trophy, AlarmClock, type LucideIcon } from "lucide-react";
import { markNotificationsReadAction } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface BellItem {
  id: string;
  kind: "plan" | "reminder" | "streak" | "milestone" | "sync";
  title: string;
  body: string;
  read: boolean;
  age: string;
}

const ICONS: Record<BellItem["kind"], LucideIcon> = {
  plan: CalendarCheck,
  reminder: AlarmClock,
  streak: Flame,
  milestone: Trophy,
  sync: RefreshCw,
};

export function NotificationBell({ items, unread }: { items: BellItem[]; unread: number }) {
  const [pending, start] = useTransition();
  const markAll = () => start(() => markNotificationsReadAction());

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Plans, reminders, streak news and LeetCode imports.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet. The morning plan lands here at 05:30.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                return (
                  <li key={n.id} className={cn("flex gap-3 p-4", !n.read && "bg-primary/5")}>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", n.read ? "text-muted-foreground" : "text-primary")} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex items-start justify-between gap-2 text-sm font-medium">
                        <span>{n.title}</span>
                        <span className="shrink-0 text-xs font-normal text-muted-foreground">{n.age}</span>
                      </p>
                      {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {unread > 0 && (
          <div className="border-t p-3">
            <Button variant="outline" className="w-full" onClick={markAll} disabled={pending}>
              <CheckCheck /> Mark all as read
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
