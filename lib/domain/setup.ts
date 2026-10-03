import { timeAgo } from "./news";

export type CheckStatus = "ok" | "warn" | "todo";

export type SetupActionId = "seed" | "sync-leetcode" | "run-morning" | "refresh-news" | "test-notify" | "test-llm";

export type SetupAction =
  | { kind: "button"; id: SetupActionId; label: string }
  | { kind: "link"; href: string; label: string; download?: boolean };

export interface SetupItem {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  /** Required items gate the dashboard's "Finish setup" card. */
  required: boolean;
  actions: SetupAction[];
}

export interface SetupInput {
  now: Date;
  content: { problems: number; expectedProblems: number; topics: number; expectedTopics: number };
  secrets: { authSecretLength: number; cronSecretLength: number };
  leetcode: {
    username: string | null;
    lastSyncAt: Date | null;
    lastError: string | null;
    /** null when the profile wasn't checked live (e.g. on the dashboard). */
    profileFound: boolean | null;
    solved: number | null;
  };
  jobs: { lastMorningAt: Date | null; lastEveningAt: Date | null };
  news: { lastFetchAt: Date | null; failed: number; feeds: number };
  notify: { telegram: boolean; email: boolean };
  llm: {
    configured: boolean;
    provider: string | null;
    /** Free providers in try order, then whether the paid last resort is ready. */
    free?: string[];
    paid?: { label: string; ready: boolean; missing: string[] };
  };
  backup: { lastExportAt: Date | null };
  session: { remember: boolean };
}

export interface SetupChecklist {
  items: SetupItem[];
  done: number;
  total: number;
  requiredLeft: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Hobby crons fire somewhere within their hour, so allow a little over a day. */
export const JOB_STALE_MS = 26 * HOUR;
export const NEWS_SETUP_STALE_MS = 26 * HOUR;
export const BACKUP_STALE_MS = 7 * DAY;
export const MIN_AUTH_SECRET = 32;
export const MIN_CRON_SECRET = 16;

const ago = (d: Date, now: Date) => timeAgo(d, now);
const fresh = (d: Date | null, now: Date, maxAge: number) => !!d && now.getTime() - d.getTime() < maxAge;

function databaseItem({ content }: SetupInput): SetupItem {
  const complete = content.problems >= content.expectedProblems && content.topics >= content.expectedTopics;
  const empty = content.problems === 0 && content.topics === 0;
  return {
    id: "database",
    title: "Content seeded",
    status: complete ? "ok" : empty ? "todo" : "warn",
    detail: complete
      ? `${content.problems} problems and ${content.topics} topics in MongoDB.`
      : `MongoDB has ${content.problems}/${content.expectedProblems} problems and ${content.topics}/${content.expectedTopics} topics. Re-seed to load the rest.`,
    required: true,
    actions: complete ? [] : [{ kind: "button", id: "seed", label: "Seed now" }],
  };
}

function secretsItem({ secrets }: SetupInput): SetupItem {
  const problems: string[] = [];
  if (secrets.authSecretLength < MIN_AUTH_SECRET) problems.push(`AUTH_SECRET needs ${MIN_AUTH_SECRET}+ characters`);
  if (secrets.cronSecretLength < MIN_CRON_SECRET) problems.push(`CRON_SECRET is ${secrets.cronSecretLength ? "too short" : "not set"}, so the daily jobs can't run`);
  return {
    id: "secrets",
    title: "Secrets",
    status: problems.length ? "todo" : "ok",
    detail: problems.length ? `${problems.join(". ")}. Generate with openssl rand and redeploy.` : "AUTH_SECRET and CRON_SECRET are set and long enough.",
    required: true,
    actions: [],
  };
}

function leetcodeItem({ leetcode, now }: SetupInput): SetupItem {
  const settingsLink: SetupAction = { kind: "link", href: "/settings#leetcode", label: "Change username" };
  if (!leetcode.username) {
    return {
      id: "leetcode",
      title: "LeetCode sync",
      status: "todo",
      detail: "Add your public LeetCode username so accepted submissions tick problems off automatically.",
      required: true,
      actions: [{ kind: "link", href: "/settings#leetcode", label: "Add username" }],
    };
  }
  if (leetcode.profileFound === false) {
    return {
      id: "leetcode",
      title: "LeetCode sync",
      status: "todo",
      detail: `No public LeetCode profile called "${leetcode.username}". Check the spelling, or make the profile public.`,
      required: true,
      actions: [settingsLink],
    };
  }
  if (leetcode.lastError) {
    return {
      id: "leetcode",
      title: "LeetCode sync",
      status: "warn",
      detail: `@${leetcode.username}: the last sync failed (${leetcode.lastError}).`,
      required: true,
      actions: [{ kind: "button", id: "sync-leetcode", label: "Sync now" }, settingsLink],
    };
  }
  const solved = leetcode.solved !== null ? ` · ${leetcode.solved} solved on LeetCode` : "";
  return {
    id: "leetcode",
    title: "LeetCode sync",
    status: leetcode.lastSyncAt ? "ok" : "warn",
    detail: leetcode.lastSyncAt
      ? `@${leetcode.username}${solved} · last synced ${ago(leetcode.lastSyncAt, now)}.`
      : `@${leetcode.username}${solved} · not synced yet.`,
    required: true,
    actions: [{ kind: "button", id: "sync-leetcode", label: "Sync now" }, settingsLink],
  };
}

function jobsItem({ jobs, now, secrets }: SetupInput): SetupItem {
  const morning = fresh(jobs.lastMorningAt, now, JOB_STALE_MS);
  const evening = fresh(jobs.lastEveningAt, now, JOB_STALE_MS);
  const describe = (label: string, d: Date | null) => `${label} ${d ? ago(d, now) : "never"}`;
  const never = !jobs.lastMorningAt && !jobs.lastEveningAt;
  return {
    id: "jobs",
    title: "Daily jobs (05:30 and 20:00)",
    status: morning && evening ? "ok" : never ? "todo" : "warn",
    detail: never
      ? "The scheduled jobs haven't run yet. On Vercel they start after the first deploy; locally, run the morning job by hand. The app still works without them."
      : `${describe("Morning ran", jobs.lastMorningAt)} · ${describe("evening ran", jobs.lastEveningAt)}.${morning && evening ? "" : " One is overdue: check Vercel → Cron Jobs and CRON_SECRET."}`,
    required: true,
    actions: secrets.cronSecretLength >= MIN_CRON_SECRET || never ? [{ kind: "button", id: "run-morning", label: "Run morning job now" }] : [],
  };
}

function newsItem({ news, now }: SetupInput): SetupItem {
  const ok = fresh(news.lastFetchAt, now, NEWS_SETUP_STALE_MS);
  const failedNote = news.failed ? ` ${news.failed} of ${news.feeds} feeds failed last time (usually temporary).` : "";
  return {
    id: "news",
    title: "News feed",
    status: !news.lastFetchAt ? "todo" : ok ? (news.failed > news.feeds / 4 ? "warn" : "ok") : "warn",
    detail: news.lastFetchAt ? `Refreshed ${ago(news.lastFetchAt, now)}.${failedNote}` : "News hasn't been fetched yet.",
    required: true,
    actions: [{ kind: "button", id: "refresh-news", label: "Refresh now" }],
  };
}

function notifyItem({ notify }: SetupInput): SetupItem {
  const channels = [notify.telegram && "Telegram", notify.email && "email"].filter(Boolean) as string[];
  return {
    id: "notify",
    title: "Reminders outside the app",
    status: channels.length ? "ok" : "warn",
    detail: channels.length
      ? `Morning plan and evening reminder are pushed to ${channels.join(" and ")}.`
      : "Optional. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID or NOTIFY_EMAIL + BREVO_API_KEY + BREVO_SENDER_EMAIL (or RESEND_API_KEY) to get reminders and the morning digest on your phone. iPhone home-screen apps can't receive push here.",
    required: false,
    actions: channels.length ? [{ kind: "button", id: "test-notify", label: "Send test" }] : [],
  };
}

function llmItem({ llm }: SetupInput): SetupItem {
  const free = llm.free ?? (llm.provider ? [llm.provider] : []);
  const paid = llm.paid;
  const chain = free.join(" then ");
  const paidNote = paid?.ready
    ? ` ${paid.label} is ready as a last resort: it only runs after you confirm, never for background jobs.`
    : paid && paid.missing.length > 0 && free.length > 0
      ? ` Optional paid fallback: set ${paid.missing.join(", ")}.`
      : "";
  return {
    id: "llm",
    title: "AI features",
    status: llm.configured ? "ok" : "warn",
    detail: llm.configured
      ? `${chain || "An AI provider"} write the daily quiz and power hints and explanations, with the question bank as fallback.${paidNote}`
      : "Optional. Without GEMINI_API_KEY or GROQ_API_KEY the app uses the 1,373-question bank and static explanations, which works fine.",
    required: false,
    actions: llm.configured ? [{ kind: "button", id: "test-llm", label: "Test" }] : [],
  };
}

function backupItem({ backup, now }: SetupInput): SetupItem {
  const ok = fresh(backup.lastExportAt, now, BACKUP_STALE_MS);
  return {
    id: "backup",
    title: "Weekly backup",
    status: ok ? "ok" : backup.lastExportAt ? "warn" : "todo",
    detail: backup.lastExportAt
      ? `Last export ${ago(backup.lastExportAt, now)}.${ok ? "" : " Atlas M0 has no automatic backups, so export again."}`
      : "Atlas M0 has no automatic backups. Download a JSON export now and then.",
    required: false,
    actions: [{ kind: "link", href: "/api/export", label: "Export now", download: true }],
  };
}

function sessionItem({ session }: SetupInput): SetupItem {
  return {
    id: "session",
    title: "Remember me on this device",
    status: session.remember ? "ok" : "warn",
    detail: session.remember
      ? "You stay signed in for 30 days, renewed whenever you use the app."
      : "This sign-in ends when the browser closes (or after 12 hours). Sign out and back in with Remember me ticked to stay signed in, which you'll want on your phone.",
    required: false,
    actions: [],
  };
}

export function buildChecklist(input: SetupInput): SetupChecklist {
  const items = [
    databaseItem(input),
    secretsItem(input),
    leetcodeItem(input),
    jobsItem(input),
    newsItem(input),
    notifyItem(input),
    llmItem(input),
    backupItem(input),
    sessionItem(input),
  ];
  return {
    items,
    done: items.filter((i) => i.status === "ok").length,
    total: items.length,
    requiredLeft: items.filter((i) => i.required && i.status !== "ok").length,
  };
}
