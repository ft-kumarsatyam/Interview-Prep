/** The messages PrepOS can send, and which of them you have switched off. Pure data and helpers. */

export const MAIL_KINDS = ["morning", "briefing", "design", "alerts", "jobs", "resume", "calendar", "nudge", "night", "weekly"] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

export type MailPrefs = Record<MailKind, boolean>;

export const DEFAULT_MAIL_PREFS: MailPrefs = { morning: true, briefing: true, design: true, alerts: true, jobs: true, resume: true, calendar: true, nudge: true, night: true, weekly: true };

export const MAIL_INFO: Record<MailKind, { label: string; when: string; what: string }> = {
  morning: { label: "Morning plan", when: "08:00 every day", what: "Today's DSA questions, theory, the daily quiz, and the backlog you still owe." },
  briefing: { label: "Daily briefing", when: "About 08:30, after the news refresh", what: "Top news for you, the system design reading and case to study, and the questions to practise." },
  design: { label: "System design topic", when: "About 08:30, once a day", what: "The one system design case to study today, with why it is next." },
  alerts: { label: "Top-news alerts", when: "As it happens, at most 3 a day", what: "Only a standout story from your sources (AI labs, engineering, system design), pushed once." },
  jobs: { label: "New job matches", when: "After each job refresh, at most 3 a day", what: "Newly listed jobs that score above your threshold against your preferences and resume." },
  resume: { label: "Resume check", when: "About 08:30, at most once a month", what: "When there is no resume saved or it has not been updated in a month, so job matching and tailoring stay accurate." },
  calendar: { label: "Calendar heads-up", when: "About 20:30, the evening before", what: "Tomorrow's mock interview, rest day or Sunday review, and the countdown as the plan end nears." },
  nudge: { label: "Evening nudge", when: "About 20:30, only if the day isn't finished", what: "What's left tonight and what the streak is at risk of." },
  night: { label: "Night recap", when: "23:59 every day", what: "What you finished, what carried over, streak and tomorrow's plan." },
  weekly: { label: "Weekly report", when: "Sunday night", what: "The week's numbers, track-by-track progress and next week's focus." },
};

export const isMailKind = (v: unknown): v is MailKind => typeof v === "string" && (MAIL_KINDS as readonly string[]).includes(v);

/** The settings field that stores a kind's flag. */
export const mailField = (kind: MailKind) => `mail${kind[0]!.toUpperCase()}${kind.slice(1)}` as `mail${Capitalize<MailKind>}`;

/** Stored flags may be missing on older settings: anything not explicitly false is on. */
export function mailPrefsFrom(doc: Partial<Record<`mail${Capitalize<MailKind>}`, boolean | null | undefined>>): MailPrefs {
  return Object.fromEntries(MAIL_KINDS.map((k) => [k, doc[mailField(k)] !== false])) as MailPrefs;
}
