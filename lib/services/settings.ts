import { news } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { toLocalDate } from "@/lib/domain/dates";
import { DEFAULT_SETTINGS, type PlanSettings } from "@/lib/domain/plan-config";
import { mergeRestDays, normaliseQueries, type SettingsInput } from "@/lib/domain/settings";
import { env } from "@/lib/env";
import { Settings, SETTINGS_ID } from "@/lib/models/system";

export interface AppSettings extends PlanSettings {
  freezeTokens: number;
  settledThrough: string | null;
  topicMasteryPct: number;
  leetcodeUsername: string | null;
  leetcodeLastSyncAt: Date | null;
  leetcodeSeenIds: string[];
  googleNewsQueries: string[] | null;
  newsLastFetchAt: Date | null;
}

/** The settings singleton, created on first read. Day logic always uses APP_TIMEZONE. */
export async function getSettings(): Promise<AppSettings> {
  await connectDb();
  const e = env();
  const doc =
    (await Settings.findById(SETTINGS_ID).lean()) ??
    (await Settings.findOneAndUpdate(
      { _id: SETTINGS_ID },
      { $setOnInsert: { _id: SETTINGS_ID, leetcodeUsername: e.LEETCODE_USERNAME ?? null } },
      { upsert: true, returnDocument: "after", lean: true },
    ));
  if (!doc) throw new Error("Settings document could not be created");

  return {
    startDate: doc.startDate ?? DEFAULT_SETTINGS.startDate,
    endDate: doc.endDate ?? DEFAULT_SETTINGS.endDate,
    timezone: e.APP_TIMEZONE,
    quizPassPct: doc.quizPassPct ?? DEFAULT_SETTINGS.quizPassPct,
    minDailyDsa: doc.minDailyDsa ?? DEFAULT_SETTINGS.minDailyDsa,
    maxDailyDsa: doc.maxDailyDsa ?? DEFAULT_SETTINGS.maxDailyDsa,
    maxSaturdayDsa: doc.maxSaturdayDsa ?? DEFAULT_SETTINGS.maxSaturdayDsa,
    maxDailyTheory: doc.maxDailyTheory ?? DEFAULT_SETTINGS.maxDailyTheory,
    revisionWeeks: doc.revisionWeeks ?? DEFAULT_SETTINGS.revisionWeeks,
    restDays: doc.restDays ?? [],
    freezeTokens: doc.freezeTokens ?? 0,
    settledThrough: doc.settledThrough ?? null,
    topicMasteryPct: doc.topicMasteryPct ?? 70,
    leetcodeUsername: doc.leetcodeUsername ?? e.LEETCODE_USERNAME ?? null,
    leetcodeLastSyncAt: doc.leetcodeLastSyncAt ?? null,
    leetcodeSeenIds: doc.leetcodeSeenIds ?? [],
    googleNewsQueries: doc.googleNewsQueries?.length ? doc.googleNewsQueries : null,
    newsLastFetchAt: doc.newsLastFetchAt ?? null,
  };
}

export type SettingsPatch = Partial<
  Pick<
    AppSettings,
    | "startDate"
    | "endDate"
    | "quizPassPct"
    | "minDailyDsa"
    | "maxDailyDsa"
    | "maxSaturdayDsa"
    | "maxDailyTheory"
    | "revisionWeeks"
    | "restDays"
    | "topicMasteryPct"
    | "leetcodeUsername"
    | "googleNewsQueries"
  >
>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: patch }, { upsert: true });
}

/**
 * Apply a validated Settings form. Past rest days stay as they were, and a new
 * LeetCode username starts a fresh sync history.
 */
export async function saveSettings(input: SettingsInput, now = new Date()): Promise<AppSettings> {
  const current = await getSettings();
  const today = toLocalDate(now, current.timezone);
  const leetcodeChanged = input.leetcodeUsername !== current.leetcodeUsername;
  await connectDb();
  await Settings.updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        startDate: input.startDate,
        endDate: input.endDate,
        quizPassPct: input.quizPassPct,
        topicMasteryPct: input.topicMasteryPct,
        minDailyDsa: input.minDailyDsa,
        maxDailyDsa: input.maxDailyDsa,
        maxSaturdayDsa: input.maxSaturdayDsa,
        maxDailyTheory: input.maxDailyTheory,
        revisionWeeks: input.revisionWeeks,
        restDays: mergeRestDays(current.restDays, input.restDays, today),
        googleNewsQueries: normaliseQueries(input.googleNewsQueries, news.googleNews.defaultQueries.map((q) => q.query)),
        leetcodeUsername: input.leetcodeUsername,
        ...(leetcodeChanged ? { leetcodeLastSyncAt: null, leetcodeSeenIds: [] } : {}),
      },
    },
    { upsert: true },
  );
  return getSettings();
}
