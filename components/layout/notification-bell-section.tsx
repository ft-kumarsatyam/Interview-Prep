import { timeAgo } from "@/modules/news/domain/news";
import { listNotifications } from "@/modules/notifications/services/notifications";
import { NotificationEffects } from "@/components/layout/notification-effects";
import { NotificationBell, type BellItem } from "@/components/layout/notification-bell";

export async function NotificationBellSection() {
  const notes = await listNotifications(20);
  const now = new Date();
  const items: BellItem[] = notes.items.map((note) => ({ ...note, age: timeAgo(new Date(note.createdAt), now) }));
  return (
    <>
      <NotificationEffects unread={notes.unread} />
      <NotificationBell items={items} unread={notes.unread} />
    </>
  );
}
