import Link from "next/link";
import { NOTIFICATION_ICONS } from "@/components/shared/notification-icons";
import type { NotificationItem } from "@/modules/notifications/services/notifications";
import { cn } from "@/core/utils";

export type FeedItem = NotificationItem & { age: string };

/** The full list on /notifications. Every row opens its message (or a short page for one-liners). */
export function NotificationFeed({ items }: { items: FeedItem[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {items.map((n) => {
        const Icon = NOTIFICATION_ICONS[n.kind];
        return (
          <li key={n.id}>
            <Link href={`/notifications/${n.id}`} className={cn("flex gap-3 p-4 transition-colors hover:bg-muted/50", !n.read && "bg-primary/5")}>
              <Icon className={cn("mt-0.5 size-4 shrink-0", n.read ? "text-muted-foreground" : "text-primary")} aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-start justify-between gap-2 text-sm font-medium">
                  <span className={cn(!n.read && "font-semibold")}>{n.title}</span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">{n.age}</span>
                </p>
                {n.body && <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>}
              </div>
              {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" role="img" aria-label="Unread" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
