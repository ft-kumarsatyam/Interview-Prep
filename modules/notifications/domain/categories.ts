/** What a stored notification is about, and how the notification centre groups them. Pure data and helpers. */

export const NOTIFICATION_KINDS = ["plan", "reminder", "recap", "streak", "milestone", "sync", "news", "design", "job", "resume", "calendar"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_GROUPS = ["study", "reading", "jobs", "resume", "calendar"] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number];

export const GROUP_INFO: Record<NotificationGroup, { label: string; kinds: readonly NotificationKind[] }> = {
  study: { label: "Daily study", kinds: ["plan", "reminder", "recap", "streak", "milestone"] },
  reading: { label: "News & design", kinds: ["news", "design"] },
  jobs: { label: "Jobs", kinds: ["job"] },
  resume: { label: "Resume", kinds: ["resume"] },
  calendar: { label: "Calendar", kinds: ["calendar"] },
};

export const isNotificationGroup = (v: unknown): v is NotificationGroup => typeof v === "string" && (NOTIFICATION_GROUPS as readonly string[]).includes(v);

/** The kinds a `?group=` filter stands for; `sync` (LeetCode imports) only shows under "all". */
export const kindsInGroup = (group: NotificationGroup): readonly NotificationKind[] => GROUP_INFO[group].kinds;
