import { Bell } from "lucide-react";

/** Shows the newest unread notification. */
export function NotificationBanner({ notification }: { notification?: { title: string; body: string } }) {
  if (!notification) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm" role="status">
      <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{notification.title}</p>
        {notification.body && <p className="text-muted-foreground">{notification.body}</p>}
      </div>
    </div>
  );
}
