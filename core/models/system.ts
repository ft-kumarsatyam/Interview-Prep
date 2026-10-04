import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { sortAtOf } from "@/modules/news/domain/news";
import { DEFAULT_SETTINGS } from "@/modules/planner/domain/plan-config";

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
    /** Cached LeetCode profile totals ({ username, at, stats }); see getCachedLeetCodeStats. */
    leetcodeStatsCache: { type: Schema.Types.Mixed, default: null },
    /** Lead morning/evening emails with a desi roast line (lib/domain/roast.ts). */
    roastMode: { type: Boolean, default: true },
    /** Roast intensity: off | coach | savage. Unset on older settings; then roastMode decides (on = savage). */
    roastLevel: { type: String, enum: ["off", "coach", "savage"], default: null },
    /** Per-email switches. Anything not explicitly false is on. */
    mailMorning: { type: Boolean, default: true },
    mailBriefing: { type: Boolean, default: true },
    mailAlerts: { type: Boolean, default: true },
    mailJobs: { type: Boolean, default: true },
    mailDesign: { type: Boolean, default: true },
    mailResume: { type: Boolean, default: true },
    mailCalendar: { type: Boolean, default: true },
    mailNudge: { type: Boolean, default: true },
    mailNight: { type: Boolean, default: true },
    mailWeekly: { type: Boolean, default: true },
    /** How many backlog items the daily plan queues for you each day (0 turns the automatic queue off). */
    backlogBudget: { type: Number, default: 2, min: 0, max: 10 },
    /** When unfinished work pushed forward passes these, the app warns and offers fixes (it never blocks). */
    carryPerDay: { type: Number, default: 4, min: 1, max: 200 },
    carryPerWeek: { type: Number, default: 10, min: 1, max: 200 },
    carryTotal: { type: Number, default: 25, min: 1, max: 200 },
    lastMorningRunAt: { type: Date, default: null },
    lastEveningRunAt: { type: Date, default: null },
    lastExportAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** RSS cache. Removed automatically 30 days after fetch. */
const articleSchema = new Schema(
  {
    urlHash: { type: String, required: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    sourceId: { type: String, required: true },
    sourceName: { type: String, required: true },
    category: { type: String, required: true },
    publishedAt: { type: Date },
    /** What the list sorts by: publishedAt, or fetchedAt minus a day when undated. Set on insert and backfilled. */
    sortAt: { type: Date },
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
    /** When extraction last failed or was retried; rate-limits the manual Retry. */
    contentTriedAt: { type: Date },
    readingMinutes: { type: Number },
    leadImage: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: false },
);
ownerScope(articleSchema, [{ fields: { urlHash: 1 } }]);
articleSchema.index({ tags: 1 });
articleSchema.index({ contentStatus: 1, category: 1 });
articleSchema.index({ readOn: 1 });
articleSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
articleSchema.index({ publishedAt: -1 });
// The list query: filter by category (and read), newest first.
articleSchema.index({ category: 1, read: 1, sortAt: -1 });
articleSchema.index({ sortAt: -1 });
articleSchema.pre("validate", function () {
  if (!this.sortAt) this.sortAt = sortAtOf(this.publishedAt, this.fetchedAt ?? new Date());
});

/** Conditional-request validators per feed, so unchanged feeds answer 304. */
const feedStateSchema = new Schema({
  sourceId: { type: String, required: true, unique: true },
  etag: { type: String },
  lastModified: { type: String },
  checkedAt: { type: Date },
});

const notificationSchema = new Schema(
  {
    kind: { type: String, enum: ["plan", "reminder", "recap", "streak", "milestone", "sync", "news", "design", "job", "resume", "calendar"], required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    read: { type: Boolean, default: false },
    /** e.g. `plan:2026-10-05`; makes cron retries idempotent. */
    dedupeKey: { type: String },
    /** The full message (a `MailSpec`) shown on /notifications/[id]; the bell keeps the short title and body. */
    detail: { type: Schema.Types.Mixed },
    /** The roast line that led the email, shown above the detail. */
    roast: { type: String },
  },
  { timestamps: true },
);
ownerScope(notificationSchema, [{ fields: { dedupeKey: 1 }, options: { partialFilterExpression: { dedupeKey: { $type: "string" } } } }]);
notificationSchema.index({ read: 1, createdAt: -1 });

/** One row per browser/device that turned on PWA notifications. Single user, so no owner field. */
const pushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    /** Short device label from the user agent, shown in Settings. */
    label: { type: String, default: "" },
    lastOkAt: { type: Date },
  },
  { timestamps: true },
);
ownerScope(pushSubscriptionSchema, [{ fields: { endpoint: 1 } }]);

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
export const FeedState = models.FeedState ?? model("FeedState", feedStateSchema);
export const Notification: Model<NotificationDoc> = models.Notification ?? model("Notification", notificationSchema);
export const LoginAttempt = models.LoginAttempt ?? model("LoginAttempt", loginAttemptSchema);
export type PushSubscriptionDoc = InferSchemaType<typeof pushSubscriptionSchema>;
export const PushSubscriptionModel: Model<PushSubscriptionDoc> =
  models.PushSubscription ?? model("PushSubscription", pushSubscriptionSchema);

export { SETTINGS_ID };
