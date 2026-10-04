import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/core/auth/dal";
import { GROUP_INFO, isNotificationGroup, kindsInGroup, NOTIFICATION_GROUPS } from "@/modules/notifications/domain/categories";
import { MarkAllRead } from "@/modules/notifications/components/mark-all-read";
import { NotificationFeed } from "@/modules/notifications/components/notification-feed";
import { listNotifications } from "@/modules/notifications/services/notifications";
import { timeAgo } from "@/modules/news/domain/news";

export const metadata: Metadata = { title: "Notifications" };

const LIMIT = 100;

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireSession();
  const { group: raw, unread: onlyUnread } = await searchParams;
  const group = isNotificationGroup(raw) ? raw : null;
  const unreadOnly = onlyUnread === "1";
  const { items, unread } = await listNotifications(LIMIT, { ...(group ? { kinds: kindsInGroup(group) } : {}), unreadOnly });
  const now = new Date();
  const href = (g: string | null, u: boolean) => {
    const p = new URLSearchParams();
    if (g) p.set("group", g);
    if (u) p.set("unread", "1");
    const q = p.toString();
    return `/notifications${q ? `?${q}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" icon={Bell} description={unread ? `${unread} unread.` : "You are all caught up."}>
        {unread > 0 && <MarkAllRead />}
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings#notifications">
            <Settings /> Choose what you get
          </Link>
        </Button>
      </PageHeader>
      <nav aria-label="Filter notifications" className="mb-4 flex flex-wrap gap-2">
        <Link href={href(null, unreadOnly)} className={chipClass(!group)} aria-current={!group ? "page" : undefined}>
          All
        </Link>
        {NOTIFICATION_GROUPS.map((g) => (
          <Link key={g} href={href(g, unreadOnly)} className={chipClass(group === g)} aria-current={group === g ? "page" : undefined}>
            {GROUP_INFO[g].label}
          </Link>
        ))}
        <Link href={href(group, !unreadOnly)} className={chipClass(unreadOnly, "ml-auto")} aria-pressed={unreadOnly}>
          Unread only
        </Link>
      </nav>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title={unreadOnly ? "Nothing unread here" : "Nothing here yet"} compact>
          The daily plan, reminders, news, system design topic, job matches, resume checks and calendar heads-ups land here.
        </EmptyState>
      ) : (
        <NotificationFeed items={items.map((n) => ({ ...n, age: timeAgo(new Date(n.createdAt), now) }))} />
      )}
    </div>
  );
}
