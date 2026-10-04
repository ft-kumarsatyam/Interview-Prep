/** The messages PrepOS can send, and which of them you have switched off. Pure data and helpers. */

export const MAIL_KINDS = ["morning", "briefing", "alerts", "jobs", "nudge", "night", "weekly"] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

export interface MailPrefs {
  morning: boolean;
  briefing: boolean;
  alerts: boolean;
  jobs: boolean;
  nudge: boolean;
  night: boolean;
  weekly: boolean;
}

export const DEFAULT_MAIL_PREFS: MailPrefs = { morning: true, briefing: true, alerts: true, jobs: true, nudge: true, night: true, weekly: true };

export const MAIL_INFO: Record<MailKind, { label: string; when: string; what: string }> = {
  morning: { label: "Morning plan", when: "08:00 every day", what: "Today's questions and theory, plus the backlog you still owe." },
  briefing: { label: "Daily briefing", when: "About 08:30, after the news refresh", what: "Top news for you, the system design reading and case to study, and the questions to practise." },
  alerts: { label: "Top-news alerts", when: "As it happens, at most 3 a day", what: "Only a standout story from your sources (AI labs, engineering, system design), pushed once." },
  jobs: { label: "New job matches", when: "After each job refresh, at most 3 a day", what: "Newly listed jobs that score above your threshold against your preferences and resume." },
  nudge: { label: "Evening nudge", when: "About 20:30, only if the day isn't finished", what: "What's left tonight and what the streak is at risk of." },
  night: { label: "Night recap", when: "23:59 every day", what: "What you finished, what carried over, streak and tomorrow's plan." },
  weekly: { label: "Weekly report", when: "Sunday night", what: "The week's numbers, track-by-track progress and next week's focus." },
};

export const isMailKind = (v: unknown): v is MailKind => typeof v === "string" && (MAIL_KINDS as readonly string[]).includes(v);

/** Stored flags may be missing on older settings: anything not explicitly false is on. */
export function mailPrefsFrom(doc: Partial<Record<`mail${Capitalize<MailKind>}`, boolean | null | undefined>>): MailPrefs {
  return {
    morning: doc.mailMorning !== false,
    briefing: doc.mailBriefing !== false,
    alerts: doc.mailAlerts !== false,
    jobs: doc.mailJobs !== false,
    nudge: doc.mailNudge !== false,
    night: doc.mailNight !== false,
    weekly: doc.mailWeekly !== false,
  };
}

/** The settings field that stores a kind's flag. */
export const mailField = (kind: MailKind) => `mail${kind[0]!.toUpperCase()}${kind.slice(1)}` as `mail${Capitalize<MailKind>}`;
