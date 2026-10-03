import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_SETTINGS } from "@/lib/domain/plan-config";

const SETTINGS_ID = "settings";

/** Singleton document holding plan configuration and streak bookkeeping. */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: SETTINGS_ID },
    startDate: { type: String, default: DEFAULT_SETTINGS.startDate },
    endDate: { type: String, default: DEFAULT_SETTINGS.endDate },
    timezone: { type: String, default: DEFAULT_SETTINGS.timezone },
    quizPassPct: { type: Number, default: DEFAULT_SETTINGS.quizPassPct },
    minDailyDsa: { type: Number, default: DEFAULT_SETTINGS.minDailyDsa },
    maxDailyDsa: { type: Number, default: DEFAULT_SETTINGS.maxDailyDsa },
    maxSaturdayDsa: { type: Number, default: DEFAULT_SETTINGS.maxSaturdayDsa },
    maxDailyTheory: { type: Number, default: DEFAULT_SETTINGS.maxDailyTheory },
    revisionWeeks: { type: Number, default: DEFAULT_SETTINGS.revisionWeeks },
    restDays: { type: [String], default: [] },
    /** Per-subject Gemini project / Gem links for the "Ask Gemini" buttons (subject id -> https link). */
    geminiLinks: { type: Map, of: String, default: undefined },
    /** Paid AI fallback (the last provider in the chain). Confirmation is on by default. */
    llmPaidEnabled: { type: Boolean, default: true },
    llmPaidDailyCap: { type: Number, default: 20 },
    llmPaidRequireConfirm: { type: Boolean, default: true },
    /** Study hours per day of week, Sunday first. Unset = the defaults in lib/domain/time-budget.ts. */
    hoursByDow: { type: [Number], default: undefined },
    /** Weekly mock days (0 = Sunday … 6 = Saturday). Shown on the dashboard and calendar; never gate the streak. */
    mockDsaWeekday: { type: Number, default: undefined },
    mockHldWeekday: { type: Number, default: undefined },
    /** Planner profile (single user): goals and focus. Hours, rest days and the plan window live above. */
    targetRole: { type: String, maxlength: 80, default: undefined },
    targetCompany: { type: String, maxlength: 80, default: "" },
    preferredLanguage: { type: String, enum: ["javascript", "typescript", "python"], default: undefined },
    priorities: { type: [String], default: undefined },
    /** When the planner setup was first saved; null shows the setup prompt. */
    plannerSetupAt: { type: Date, default: null },
    freezeTokens: { type: Number, default: 0 },
    /** Last day whose streak outcome has been settled. */
    settledThrough: { type: String, default: null },
    googleNewsQueries: { type: [String], default: undefined },
    topicMasteryPct: { type: Number, default: 70 },
    leetcodeUsername: { type: String, default: null },
    leetcodeLastSyncAt: { type: Date, default: null },
    /** Last "did my submission land?" check from a problem page, so polling can't hammer LeetCode. */
    leetcodeLastCheckAt: { type: Date, default: null },
    /** Recent accepted-submission ids already imported (capped). */
    leetcodeSeenIds: { type: [String], default: [] },
    newsLastFetchAt: { type: Date, default: null },
    /** Feed ids that failed on the last refresh (for the Setup page). */
    newsLastFailed: { type: [String], default: [] },
    /** Last LeetCode sync error, cleared on the next successful sync. */
    leetcodeLastError: { type: String, default: null },
    /** Lead morning/evening emails with a desi roast line (lib/domain/roast.ts). */
    roastMode: { type: Boolean, default: true },
    lastMorningRunAt: { type: Date, default: null },
    lastEveningRunAt: { type: Date, default: null },
    lastExportAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** RSS cache. Removed automatically 30 days after fetch. */
const articleSchema = new Schema(
  {
    urlHash: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    sourceId: { type: String, required: true },
    sourceName: { type: String, required: true },
    category: { type: String, required: true },
    publishedAt: { type: Date },
    fetchedAt: { type: Date, default: () => new Date() },
    snippet: { type: String, maxlength: 600 },
    aiSummary: { type: String, maxlength: 400 },
    read: { type: Boolean, default: false },
    /** Local date the article was first opened; feeds DayLog.readings. */
    readOn: { type: String, default: null },
    bookmarked: { type: Boolean, default: false },
    titleKey: { type: String, index: true },
    /** Article body as markdown (never HTML). Left out of list queries. */
    content: { type: String, maxlength: 90_000 },
    /** null = not tried yet; see ContentStatus in lib/domain/article.ts. */
    contentStatus: { type: String, enum: ["full", "extracted", "failed", "headline", null], default: null },
    contentError: { type: String, maxlength: 300 },
    readingMinutes: { type: Number },
    leadImage: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: false },
);
articleSchema.index({ tags: 1 });
articleSchema.index({ contentStatus: 1, category: 1 });
articleSchema.index({ readOn: 1 });
articleSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
articleSchema.index({ publishedAt: -1 });

const notificationSchema = new Schema(
  {
    kind: { type: String, enum: ["plan", "reminder", "recap", "streak", "milestone", "sync"], required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    read: { type: Boolean, default: false },
    /** e.g. `plan:2026-10-05`; makes cron retries idempotent. */
    dedupeKey: { type: String },
  },
  { timestamps: true },
);
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

/** Failed logins, kept for 15 minutes for throttling. */
const loginAttemptSchema = new Schema({
  ip: { type: String, required: true },
  at: { type: Date, default: () => new Date(), expires: 15 * 60 },
});
loginAttemptSchema.index({ ip: 1, at: -1 });

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;
export type ArticleDoc = InferSchemaType<typeof articleSchema>;
export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Settings: Model<SettingsDoc> = models.Settings ?? model("Settings", settingsSchema);
export const Article: Model<ArticleDoc> = models.Article ?? model("Article", articleSchema);
export const Notification: Model<NotificationDoc> = models.Notification ?? model("Notification", notificationSchema);
export const LoginAttempt = models.LoginAttempt ?? model("LoginAttempt", loginAttemptSchema);

export { SETTINGS_ID };
