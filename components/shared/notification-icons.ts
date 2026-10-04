import { AlarmClock, Briefcase, CalendarCheck, CalendarDays, ClipboardCheck, FileText, Flame, Layers, Newspaper, RefreshCw, Trophy, type LucideIcon } from "lucide-react";

export type NotificationIconKind = "plan" | "reminder" | "recap" | "streak" | "milestone" | "sync" | "news" | "design" | "job" | "resume" | "calendar";

/** One icon per notification kind, shared by the bell and the notification centre. */
export const NOTIFICATION_ICONS: Record<NotificationIconKind, LucideIcon> = {
  plan: CalendarCheck,
  reminder: AlarmClock,
  recap: ClipboardCheck,
  streak: Flame,
  milestone: Trophy,
  sync: RefreshCw,
  news: Newspaper,
  design: Layers,
  job: Briefcase,
  resume: FileText,
  calendar: CalendarDays,
};
