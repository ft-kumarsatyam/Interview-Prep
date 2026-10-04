import { mailField, mailPrefsFrom, type MailKind, type MailPrefs } from "@/lib/domain/mail-prefs";
import { effectiveRoastLevel, type RoastLevel } from "@/lib/domain/roast";
import { cache } from "react";
import { news } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { toLocalDate } from "@/lib/domain/dates";
import { DEFAULT_SETTINGS, type PlanSettings } from "@/lib/domain/plan-config";
import { DEFAULT_PAID_SETTINGS, type PaidSettings } from "@/lib/domain/llm-router";
import { checkGeminiLink, isAskSubject, type AskSubject } from "@/lib/domain/ask-subjects";
import { DEFAULT_MOCK_SCHEDULE } from "@/lib/domain/mock";
import { DEFAULT_HOURS } from "@/lib/domain/time-budget";
import { DEFAULT_PROFILE, LANGUAGES, PRIORITIES, type PlannerProfile, type PriorityId } from "@/lib/domain/planner-profile";
import { mergeRestDays, normaliseQueries, type SettingsInput } from "@/lib/domain/settings";
import { diffPlannerChanges } from "@/lib/domain/plan-changes";
import { env } from "@/lib/env";
import { Settings, SETTINGS_ID } from "@/lib/models/system";
import { logPlanChange } from "./plan-log";

export interface AppSettings extends PlanSettings {
  profile: PlannerProfile;
  plannerSetupAt: Date | null;
  llmPaid: PaidSettings;
  geminiLinks: Partial<Record<AskSubject, string>>;
  mockSchedule: { dsaWeekday: number; hldWeekday: number };
  freezeTokens: number;
  settledThrough: string | null;
  topicMasteryPct: number;
  leetcodeUsername: string | null;
  leetcodeLastSyncAt: Date | null;
  leetcodeSeenIds: string[];
  googleNewsQueries: string[] | null;
  newsLastFetchAt: Date | null;
  newsLastFailed: string[];
  leetcodeLastError: string | null;
  roastMode: boolean;
  /** Effective roast intensity (see effectiveRoastLevel). `roastMode` is true for coach and savage. */
  roastLevel: RoastLevel;
  mail: MailPrefs;
  /** Backlog items queued into each day (0 = off). */
  backlogBudget: number;
  lastMorningRunAt: Date | null;
  lastEveningRunAt: Date | null;
  lastExportAt: Date | null;
}

/** Per-request slot; `cache()` hands every caller in one request the same holder (a plain call outside a request gets a fresh one). */
const requestSlot = cache(() => ({ value: null as Promise<AppSettings> | null }));

/** Drop this request's memoised settings. Call after any write to the Settings document. */
export function invalidateSettings(): void {
  requestSlot().value = null;
}

/** The settings singleton, created on first read and memoised for the rest of the request. Day logic always uses APP_TIMEZONE. */
export function getSettings(): Promise<AppSettings> {
  const slot = requestSlot();
  const pending = (slot.value ??= loadSettings());
  pending.catch(() => {
    if (slot.value === pending) slot.value = null;
  });
  return pending;
}

async function loadSettings(): Promise<AppSettings> {
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
    hoursByDow: doc.hoursByDow?.length === 7 ? [...doc.hoursByDow] : [...DEFAULT_HOURS],
    profile: profileFrom(doc),
    plannerSetupAt: doc.plannerSetupAt ?? null,
    llmPaid: {
      enabled: doc.llmPaidEnabled ?? DEFAULT_PAID_SETTINGS.enabled,
      dailyCap: doc.llmPaidDailyCap ?? DEFAULT_PAID_SETTINGS.dailyCap,
      requireConfirm: doc.llmPaidRequireConfirm ?? DEFAULT_PAID_SETTINGS.requireConfirm,
    },
    geminiLinks: cleanLinks(doc.geminiLinks),
    mockSchedule: {
      dsaWeekday: doc.mockDsaWeekday ?? DEFAULT_MOCK_SCHEDULE.dsaWeekday,
      hldWeekday: doc.mockHldWeekday ?? DEFAULT_MOCK_SCHEDULE.hldWeekday,
    },
    freezeTokens: doc.freezeTokens ?? 0,
    settledThrough: doc.settledThrough ?? null,
    topicMasteryPct: doc.topicMasteryPct ?? 70,
    leetcodeUsername: doc.leetcodeUsername ?? e.LEETCODE_USERNAME ?? null,
    leetcodeLastSyncAt: doc.leetcodeLastSyncAt ?? null,
    leetcodeSeenIds: doc.leetcodeSeenIds ?? [],
    googleNewsQueries: doc.googleNewsQueries?.length ? doc.googleNewsQueries : null,
    newsLastFetchAt: doc.newsLastFetchAt ?? null,
    newsLastFailed: doc.newsLastFailed ?? [],
    leetcodeLastError: doc.leetcodeLastError ?? null,
    roastMode: effectiveRoastLevel(doc.roastLevel as RoastLevel | null, doc.roastMode) !== "off",
    roastLevel: effectiveRoastLevel(doc.roastLevel as RoastLevel | null, doc.roastMode),
    mail: mailPrefsFrom(doc),
    backlogBudget: typeof doc.backlogBudget === "number" ? doc.backlogBudget : 2,
    lastMorningRunAt: doc.lastMorningRunAt ?? null,
    lastEveningRunAt: doc.lastEveningRunAt ?? null,
    lastExportAt: doc.lastExportAt ?? null,
  };
}

function profileFrom(doc: { targetRole?: string | null; targetCompany?: string | null; preferredLanguage?: string | null; priorities?: string[] | null }): PlannerProfile {
  const ids = new Set<string>(PRIORITIES.map((p) => p.id));
  const priorities = (doc.priorities ?? []).filter((p): p is PriorityId => ids.has(p));
  return {
    targetRole: doc.targetRole ?? DEFAULT_PROFILE.targetRole,
    targetCompany: doc.targetCompany ?? "",
    preferredLanguage: (LANGUAGES as readonly string[]).includes(doc.preferredLanguage ?? "") ? (doc.preferredLanguage as PlannerProfile["preferredLanguage"]) : DEFAULT_PROFILE.preferredLanguage,
    priorities: priorities.length ? priorities : [...DEFAULT_PROFILE.priorities],
  };
}

/** Timestamps the Setup page reads to tell whether jobs and backups are happening. */
export async function markRun(field: "lastMorningRunAt" | "lastEveningRunAt" | "lastExportAt", at = new Date()): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { [field]: at } }, { upsert: true });
  invalidateSettings();
}

export async function setRoastMode(on: boolean): Promise<void> {
  await setRoastLevel(on ? "savage" : "off");
}

/** Stores the level and keeps the older on/off flag in step with it. */
export async function setRoastLevel(level: RoastLevel): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { roastLevel: level, roastMode: level !== "off" } }, { upsert: true });
  invalidateSettings();
}

export async function setBacklogBudget(n: number): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { backlogBudget: Math.min(10, Math.max(0, Math.round(n))) } }, { upsert: true });
  invalidateSettings();
}

export async function setMailPref(kind: MailKind, on: boolean): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { [mailField(kind)]: on } }, { upsert: true });
  invalidateSettings();
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
    | "hoursByDow"
    | "topicMasteryPct"
    | "leetcodeUsername"
    | "googleNewsQueries"
  >
>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  await connectDb();
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: patch }, { upsert: true });
  invalidateSettings();
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
        ...(input.hoursByDow ? { hoursByDow: input.hoursByDow } : {}),
        ...(input.geminiLinks ? { geminiLinks: normaliseLinks(input.geminiLinks) } : {}),
        ...(input.llmPaidEnabled !== undefined ? { llmPaidEnabled: input.llmPaidEnabled } : {}),
        ...(input.llmPaidDailyCap !== undefined ? { llmPaidDailyCap: input.llmPaidDailyCap } : {}),
        ...(input.llmPaidRequireConfirm !== undefined ? { llmPaidRequireConfirm: input.llmPaidRequireConfirm } : {}),
        ...(input.mockDsaWeekday !== undefined ? { mockDsaWeekday: input.mockDsaWeekday } : {}),
        ...(input.mockHldWeekday !== undefined ? { mockHldWeekday: input.mockHldWeekday } : {}),
        googleNewsQueries: normaliseQueries(input.googleNewsQueries, news.googleNews.defaultQueries.map((q) => q.query)),
        leetcodeUsername: input.leetcodeUsername,
        ...(leetcodeChanged ? { leetcodeLastSyncAt: null, leetcodeSeenIds: [], leetcodeLastError: null } : {}),
      },
    },
    { upsert: true },
  );
  invalidateSettings();
  const updated = await getSettings();
  const plannerState = (s: AppSettings) => ({ profile: s.profile, startDate: s.startDate, endDate: s.endDate, hoursByDow: s.hoursByDow ?? [], restDays: s.restDays });
  for (const change of diffPlannerChanges(plannerState(current), plannerState(updated))) await logPlanChange(change, today);
  return updated;
}

/** A lean Map comes back as a plain object; keep only known subjects with valid links. */
function cleanLinks(raw: unknown): Partial<Record<AskSubject, string>> {
  const entries = raw instanceof Map ? [...raw] : Object.entries((raw ?? {}) as Record<string, unknown>);
  const out: Partial<Record<AskSubject, string>> = {};
  for (const [subject, value] of entries) {
    if (!isAskSubject(subject) || typeof value !== "string") continue;
    const check = checkGeminiLink(value);
    if (check.ok && check.url) out[subject] = check.url;
  }
  return out;
}

/** Validated form links: normalised, blanks dropped. */
function normaliseLinks(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(cleanLinks(input)));
}
