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
    freezeTokens: { type: Number, default: 0 },
    /** Last day whose streak outcome has been settled. */
    settledThrough: { type: String, default: null },
    googleNewsQueries: { type: [String], default: undefined },
    topicMasteryPct: { type: Number, default: 70 },
    leetcodeUsername: { type: String, default: null },
    leetcodeLastSyncAt: { type: Date, default: null },
    /** Recent accepted-submission ids already imported (capped). */
    leetcodeSeenIds: { type: [String], default: [] },
    newsLastFetchAt: { type: Date, default: null },
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
  },
  { timestamps: false },
);
articleSchema.index({ readOn: 1 });
articleSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
articleSchema.index({ publishedAt: -1 });

const notificationSchema = new Schema(
  {
    kind: { type: String, enum: ["plan", "reminder", "streak", "milestone", "sync"], required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
notificationSchema.index({ read: 1, createdAt: -1 });

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
