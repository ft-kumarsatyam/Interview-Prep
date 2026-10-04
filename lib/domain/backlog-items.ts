/**
 * The backlog engine: everything you owe beyond today's plan, as one list of items with a priority.
 * Pure. The service loads data and calls the `*Items` builders; `assembleBacklog` filters out what you
 * snoozed or dismissed and ranks the rest; `pickBudget` chooses the few items worth pulling into today.
 * The backlog never affects the streak: the daily quiz stays the only hard requirement.
 */
import { addDays, diffDays, type DateStr } from "./dates";

export const BACKLOG_KINDS = ["review", "theory", "dsa", "company", "quiz", "design", "mock", "reading"] as const;
export type BacklogKind = (typeof BACKLOG_KINDS)[number];

export const BACKLOG_KIND_INFO: Record<BacklogKind, { label: string; noun: string; path: string }> = {
  review: { label: "Overdue reviews", noun: "reviews", path: "/review" },
  theory: { label: "Theory from past weeks", noun: "subtopics", path: "/learn" },
  dsa: { label: "DSA behind plan", noun: "problems", path: "/dsa" },
  company: { label: "Target-company gaps", noun: "items", path: "/targets" },
  quiz: { label: "Topic quizzes to take", noun: "quizzes", path: "/learn" },
  design: { label: "System design cases", noun: "cases", path: "/design" },
  mock: { label: "Missed mock interviews", noun: "mocks", path: "/mock" },
  reading: { label: "Saved articles", noun: "articles", path: "/news" },
};

export interface BacklogItem {
  /** Stable id such as `dsa:two-sum`; user state (snooze, dismiss, pull) is keyed by it. */
  key: string;
  kind: BacklogKind;
  title: string;
  note?: string;
  /** Where to do it, an app path. */
  path: string;
  /** The day it became owed, for age. */
  since?: DateStr;
  /** Rough minutes it takes. */
  minutes: number;
  /** Order within its kind (0 = first). */
  rank: number;
  /** Added to the priority, e.g. for a dream-company gap. */
  boost?: number;
}

export type BacklogStateStatus = "snoozed" | "dismissed";
export interface BacklogUserState {
  status: BacklogStateStatus;
  /** For a snooze: the first day it comes back. */
  until: DateStr | null;
}

/* ------------------------------ builders, one per kind ------------------------------ */

const keyOf = (kind: BacklogKind, ref: string) => `${kind}:${ref}`;

export function reviewItems(input: { overdue: ReadonlyArray<{ slug: string; title: string; nextReviewAt: DateStr }>; inToday: ReadonlySet<string> }): BacklogItem[] {
  return input.overdue
    .filter((r) => !input.inToday.has(r.slug))
    .toSorted((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
    .map((r, rank) => ({ key: keyOf("review", r.slug), kind: "review" as const, title: r.title, note: "re-solve", path: `/dsa/${r.slug}`, since: r.nextReviewAt, minutes: 15, rank }));
}

const DSA_MINUTES = { Easy: 20, Medium: 35, Hard: 55 } as const;

/** The first `behind` unsolved problems after today's. `behind` is how far under the ideal pace you are. */
export function dsaItems(input: {
  behind: number;
  unsolved: ReadonlyArray<{ slug: string; title: string; difficulty: keyof typeof DSA_MINUTES }>;
  todayProblems: ReadonlySet<string>;
  today: DateStr;
}): BacklogItem[] {
  const behind = Math.max(0, input.behind);
  return input.unsolved
    .filter((p) => !input.todayProblems.has(p.slug))
    .slice(0, behind)
    .map((p, rank) => ({ key: keyOf("dsa", p.slug), kind: "dsa" as const, title: p.title, note: p.difficulty, path: `/dsa/${p.slug}`, since: input.today, minutes: DSA_MINUTES[p.difficulty], rank }));
}

export function theoryItems(input: {
  subtopics: ReadonlyArray<{ id: string; title: string; topicId: string; topicTitle: string; week: number; position: number; done: boolean }>;
  currentWeek: number;
  todayTheory: ReadonlySet<string>;
  planStart: DateStr;
}): BacklogItem[] {
  return input.subtopics
    .filter((t) => !t.done && t.week < input.currentWeek && !input.todayTheory.has(t.id))
    .toSorted((a, b) => a.position - b.position)
    .map((t, rank) => ({
      key: keyOf("theory", t.id),
      kind: "theory" as const,
      title: t.title,
      note: t.topicTitle,
      path: `/learn/${t.topicId}`,
      // The Sunday that ended the subtopic's week: when it started to be owed.
      since: addDays(input.planStart, t.week * 7 - 1),
      minutes: 25,
      rank,
    }));
}

/** Topics where every subtopic is ticked but the topic quiz hasn't been passed. */
export function topicQuizItems(input: { topics: ReadonlyArray<{ id: string; title: string; subtopics: number; ticked: number; mastered: boolean; week: number }>; today: DateStr }): BacklogItem[] {
  return input.topics
    .filter((t) => t.subtopics > 0 && t.ticked >= t.subtopics && !t.mastered)
    .toSorted((a, b) => a.week - b.week)
    .map((t, rank) => ({ key: keyOf("quiz", t.id), kind: "quiz" as const, title: `${t.title} topic quiz`, note: "unlocks Mastered", path: `/learn/practice?ref=${encodeURIComponent(t.id)}`, since: input.today, minutes: 15, rank }));
}

/** Cases from finished weeks you haven't practised. */
export function designItems(input: { cases: ReadonlyArray<{ slug: string; title: string; week: number; status: "new" | "studying" | "practised" | "mastered" }>; currentWeek: number; planStart: DateStr }): BacklogItem[] {
  return input.cases
    .filter((c) => (c.status === "new" || c.status === "studying") && c.week < input.currentWeek)
    .toSorted((a, b) => a.week - b.week)
    .map((c, rank) => ({
      key: keyOf("design", c.slug),
      kind: "design" as const,
      title: c.title,
      note: c.status === "new" ? "not started" : "in progress",
      path: `/design/${c.slug}`,
      since: addDays(input.planStart, c.week * 7 - 1),
      minutes: 45,
      rank,
    }));
}

export function mockItems(missed: ReadonlyArray<{ kind: "dsa" | "hld"; date: DateStr }>): BacklogItem[] {
  return missed
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((m, rank) => ({
      key: keyOf("mock", `${m.kind}:${m.date}`),
      kind: "mock" as const,
      title: m.kind === "dsa" ? "Weekly DSA mock" : "Weekly system design mock",
      note: `was due ${m.date}`,
      path: "/mock",
      since: m.date,
      minutes: m.kind === "dsa" ? 60 : 45,
      rank,
    }));
}

export function readingItems(articles: ReadonlyArray<{ id: string; title: string; source: string; minutes: number | null; savedOn: DateStr }>): BacklogItem[] {
  return articles.map((a, rank) => ({ key: keyOf("reading", a.id), kind: "reading" as const, title: a.title, note: a.source, path: `/news/${a.id}`, since: a.savedOn, minutes: a.minutes ?? 8, rank }));
}

/** One item per gap in a target company's blueprint. */
export function companyItems(gaps: ReadonlyArray<{ key: string; title: string; note: string; path: string; minutes: number; boost: number }>, today: DateStr): BacklogItem[] {
  return gaps.map((g, rank) => ({ key: keyOf("company", g.key), kind: "company" as const, title: g.title, note: g.note, path: g.path, since: today, minutes: g.minutes, rank, boost: g.boost }));
}

/* ----------------------------------- ranking ----------------------------------- */

/** Reviews decay fastest and are cheap, so they lead; company gaps follow because they point at an interview. */
export const KIND_WEIGHT: Record<BacklogKind, number> = { review: 100, company: 85, theory: 80, dsa: 75, quiz: 70, mock: 60, design: 55, reading: 20 };
const AGE_CAP_DAYS = 60;
const AGE_PER_DAY = 0.5;
const RANK_PENALTY = 0.05;

export function priorityOf(item: BacklogItem, today: DateStr): number {
  const age = item.since ? Math.min(AGE_CAP_DAYS, Math.max(0, diffDays(today, item.since))) : 0;
  return KIND_WEIGHT[item.kind] + (item.boost ?? 0) + age * AGE_PER_DAY - Math.min(item.rank, 400) * RANK_PENALTY;
}

export interface AssembledBacklog {
  /** Still owed and not hidden, highest priority first. */
  open: BacklogItem[];
  snoozed: BacklogItem[];
  dismissedCount: number;
  byKind: Record<BacklogKind, number>;
  totalMinutes: number;
}

/** Applies your snoozes and dismissals (a snooze ends on its `until` day) and ranks what is left. */
export function assembleBacklog(items: readonly BacklogItem[], state: ReadonlyMap<string, BacklogUserState>, today: DateStr): AssembledBacklog {
  const open: BacklogItem[] = [];
  const snoozed: BacklogItem[] = [];
  let dismissedCount = 0;
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    const s = state.get(item.key);
    if (s?.status === "dismissed") dismissedCount++;
    else if (s?.status === "snoozed" && s.until !== null && s.until > today) snoozed.push(item);
    else open.push(item);
  }
  open.sort((a, b) => priorityOf(b, today) - priorityOf(a, today) || a.key.localeCompare(b.key));
  const byKind = Object.fromEntries(BACKLOG_KINDS.map((k) => [k, 0])) as Record<BacklogKind, number>;
  for (const i of open) byKind[i.kind]++;
  return { open, snoozed, dismissedCount, byKind, totalMinutes: open.reduce((n, i) => n + i.minutes, 0) };
}

/**
 * The items to queue for today: the highest priorities, at most half the budget (rounded up) from any one
 * kind so the queue is a mix, then topped up if a kind ran dry. Skips what is already queued today.
 */
export function pickBudget(open: readonly BacklogItem[], budget: number, alreadyQueued: ReadonlySet<string>): BacklogItem[] {
  const want = Math.max(0, Math.floor(budget));
  if (want === 0) return [];
  const cap = Math.max(1, Math.ceil(want / 2));
  const queued = open.filter((i) => alreadyQueued.has(i.key)).length;
  const room = Math.max(0, want - queued);
  const picked: BacklogItem[] = [];
  const perKind = new Map<BacklogKind, number>();
  for (const i of open) {
    if (picked.length >= room) break;
    if (alreadyQueued.has(i.key)) continue;
    if ((perKind.get(i.kind) ?? 0) >= cap) continue;
    picked.push(i);
    perKind.set(i.kind, (perKind.get(i.kind) ?? 0) + 1);
  }
  for (const i of open) {
    if (picked.length >= room) break;
    if (alreadyQueued.has(i.key) || picked.includes(i)) continue;
    picked.push(i);
  }
  return picked;
}

export function snoozeUntil(today: DateStr, days: 1 | 3 | 7): DateStr {
  return addDays(today, days);
}

/** Minutes as "1 h 20 min" for the page and mails; past ten hours the minutes are noise, so just "85 h". */
export function minutesLabel(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 || h >= 10 ? `${h} h` : `${h} h ${r} min`;
}

/* ------------------------------- the shape emails use ------------------------------- */

export interface MailBacklogGroup {
  kind: BacklogKind;
  label: string;
  noun: string;
  /** Items of this kind that are open, which can exceed `items`. */
  total: number;
  items: Array<{ title: string; path: string; note?: string }>;
  /** Where the rest live. */
  path: string;
}

export interface MailBacklog {
  total: number;
  totalMinutes: number;
  groups: MailBacklogGroup[];
  /** Today's queue, still open. */
  queue: Array<{ title: string; path: string; note?: string }>;
  budget: number;
}

export const MAIL_GROUP_LIMIT = 4;

/** Turns the assembled backlog into per-kind groups (highest priority first inside each) and today's queue. */
export function mailBacklog(assembled: AssembledBacklog, queue: readonly BacklogItem[], budget: number, limit = MAIL_GROUP_LIMIT): MailBacklog {
  const link = (i: BacklogItem) => ({ title: i.title, path: i.path, ...(i.note ? { note: i.note } : {}) });
  const groups = BACKLOG_KINDS.flatMap((kind) => {
    const inKind = assembled.open.filter((i) => i.kind === kind);
    if (inKind.length === 0) return [];
    const info = BACKLOG_KIND_INFO[kind];
    return [{ kind, label: info.label, noun: info.noun, total: inKind.length, items: inKind.slice(0, limit).map(link), path: info.path }];
  });
  return { total: assembled.open.length, totalMinutes: assembled.totalMinutes, groups, queue: queue.map(link), budget };
}
