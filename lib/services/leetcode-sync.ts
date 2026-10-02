import { problemBySlug } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { toLocalDate, type DateStr } from "@/lib/domain/dates";
import { planSync } from "@/lib/domain/leetcode";
import { leetcodeClient, type LeetCodeClient, type LeetCodeStats } from "@/lib/leetcode/client";
import { ProblemProgress } from "@/lib/models/progress";
import { Notification, Settings, SETTINGS_ID } from "@/lib/models/system";
import { todayIn } from "./plan";
import { recordSolve } from "./progress";
import { getSettings } from "./settings";

export const SYNC_THROTTLE_MS = 10 * 60 * 1000;
const SEEN_CAP = 200;

export type SyncResult =
  | { status: "disabled" }
  | { status: "throttled"; lastSyncAt: Date }
  | { status: "ok"; imported: number; untracked: number }
  | { status: "error"; message: string };

/**
 * Pull recent accepted submissions and record any new solves. Throttled and
 * claimed with a compare-and-set on `leetcodeLastSyncAt`, so the dashboard,
 * cron and the "Sync now" button can all call it safely.
 */
export async function syncLeetCode(opts: { force?: boolean; now?: Date; client?: LeetCodeClient } = {}): Promise<SyncResult> {
  const now = opts.now ?? new Date();
  const client = opts.client ?? leetcodeClient;
  const s = await getSettings();
  if (!s.leetcodeUsername) return { status: "disabled" };

  const last = s.leetcodeLastSyncAt;
  if (!opts.force && last && now.getTime() - last.getTime() < SYNC_THROTTLE_MS) return { status: "throttled", lastSyncAt: last };

  await connectDb();
  const claim = await Settings.updateOne({ _id: SETTINGS_ID, leetcodeLastSyncAt: last }, { $set: { leetcodeLastSyncAt: now } });
  if (claim.modifiedCount === 0) return { status: "throttled", lastSyncAt: now };

  try {
    const submissions = await client.recentAccepted(s.leetcodeUsername, 20);
    const rows = await ProblemProgress.find(
      { slug: { $in: submissions.map((x) => x.titleSlug) } },
      { slug: 1, solveDates: 1 },
    ).lean();
    const plan = planSync({
      submissions,
      knownSlugs: new Set(problemBySlug.keys()),
      solveDates: new Map(rows.map((r) => [r.slug, r.solveDates ?? []])),
      seenIds: new Set(s.leetcodeSeenIds),
      timeZone: s.timezone,
      today: todayIn(s, now),
    });

    for (const intent of plan.intents) {
      await recordSolve({ slug: intent.slug, date: intent.date, source: "leetcode" });
    }
    const seen = [...new Set([...submissions.map((x) => x.id), ...s.leetcodeSeenIds])].slice(0, SEEN_CAP);
    await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { leetcodeSeenIds: seen, leetcodeLastError: null } });

    if (plan.intents.length > 0) {
      const titles = [...new Set(plan.intents.map((i) => problemBySlug.get(i.slug)?.title ?? i.slug))];
      await Notification.create({
        kind: "sync",
        title: `Imported ${plan.intents.length} solve${plan.intents.length === 1 ? "" : "s"} of ${titles.length} problem${titles.length === 1 ? "" : "s"} from LeetCode`,
        body: `${titles.slice(0, 3).join(", ")}${titles.length > 3 ? "…" : ""}. Add confidence so reviews are scheduled right.`,
      });
    }
    return { status: "ok", imported: plan.intents.length, untracked: plan.untracked.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "LeetCode sync failed";
    await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { leetcodeLastError: message.slice(0, 300) } });
    return { status: "error", message };
  }
}

/** Profile totals for the stats page. Never throws: LeetCode being down shouldn't break the page. */
export async function getLeetCodeStats(client: LeetCodeClient = leetcodeClient): Promise<LeetCodeStats | null> {
  const s = await getSettings();
  if (!s.leetcodeUsername) return null;
  try {
    return await client.stats(s.leetcodeUsername);
  } catch {
    return null;
  }
}

/** Polling floor and the window an Accepted submission must fall in to count as "the one I just made". */
export const CHECK_FLOOR_MS = 30_000;
const SINCE_MAX_AGE_MS = 6 * 3_600_000;
const SINCE_SKEW_MS = 2 * 60_000;

export type AcceptedCheck =
  | { status: "disabled" }
  | { status: "wait" }
  | { status: "pending" }
  | { status: "accepted"; date: DateStr }
  | { status: "error"; message: string };

/**
 * After "Copy and open LeetCode": has an Accepted submission of `slug` appeared on your public profile since
 * `sinceMs`? If so it is imported like any synced solve (needs details), and the date is returned so the solve
 * form can open. At most one real LeetCode request per 30 s, claimed with a compare-and-set so overlapping
 * polls can't double up. No cookie is involved: this reads only the public recent-accepted list.
 */
export async function checkAccepted(input: { slug: string; sinceMs: number; now?: Date; client?: LeetCodeClient }): Promise<AcceptedCheck> {
  const now = input.now ?? new Date();
  const client = input.client ?? leetcodeClient;
  if (!problemBySlug.has(input.slug)) return { status: "error", message: "Unknown problem" };
  const s = await getSettings();
  if (!s.leetcodeUsername) return { status: "disabled" };

  await connectDb();
  const doc = await Settings.findById(SETTINGS_ID, { leetcodeLastCheckAt: 1 }).lean();
  const last = doc?.leetcodeLastCheckAt ?? null;
  if (last && now.getTime() - last.getTime() < CHECK_FLOOR_MS) return { status: "wait" };
  const claim = await Settings.updateOne({ _id: SETTINGS_ID, leetcodeLastCheckAt: last }, { $set: { leetcodeLastCheckAt: now } });
  if (claim.modifiedCount === 0) return { status: "wait" };

  const since = Math.min(Math.max(input.sinceMs, now.getTime() - SINCE_MAX_AGE_MS), now.getTime() + SINCE_SKEW_MS);
  try {
    const submissions = await client.recentAccepted(s.leetcodeUsername, 20);
    const match = submissions.find((x) => x.titleSlug === input.slug && x.timestamp * 1000 >= since - SINCE_SKEW_MS);
    if (!match) return { status: "pending" };
    await syncLeetCode({ client, force: true, now });
    return { status: "accepted", date: toLocalDate(new Date(match.timestamp * 1000), s.timezone) };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message.slice(0, 200) : "LeetCode check failed" };
  }
}
