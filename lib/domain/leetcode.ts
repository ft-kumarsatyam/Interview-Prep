import { toLocalDate, type DateStr } from "./dates";

export interface Submission {
  id: string;
  titleSlug: string;
  /** Unix seconds. */
  timestamp: number;
}

export interface SyncIntent {
  slug: string;
  date: DateStr;
  submissionId: string;
}

export interface SyncPlan {
  intents: SyncIntent[];
  /** Accepted on LeetCode but not part of the PrepOS problem list. */
  untracked: string[];
}

/**
 * Turn recent accepted submissions into solve intents, oldest first so a
 * later re-solve lands after the first solve. Skips submissions already seen,
 * untracked slugs, and days a problem already has a logged solve.
 */
export function planSync(input: {
  submissions: Submission[];
  knownSlugs: ReadonlySet<string>;
  solveDates: ReadonlyMap<string, readonly DateStr[]>;
  seenIds: ReadonlySet<string>;
  timeZone: string;
  today: DateStr;
}): SyncPlan {
  const untracked = new Set<string>();
  const claimed = new Set<string>();
  const intents: SyncIntent[] = [];

  for (const s of [...input.submissions].sort((a, b) => a.timestamp - b.timestamp)) {
    if (input.seenIds.has(s.id)) continue;
    if (!input.knownSlugs.has(s.titleSlug)) {
      untracked.add(s.titleSlug);
      continue;
    }
    const date = toLocalDate(new Date(s.timestamp * 1000), input.timeZone);
    if (date > input.today) continue;
    const key = `${s.titleSlug}@${date}`;
    if (claimed.has(key) || input.solveDates.get(s.titleSlug)?.includes(date)) continue;
    claimed.add(key);
    intents.push({ slug: s.titleSlug, date, submissionId: s.id });
  }
  return { intents, untracked: [...untracked] };
}
