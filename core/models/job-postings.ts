import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { JD_STORE_MAX, POSTING_SOURCES } from "@/modules/jobs/domain/job-postings";

const THIRTY_DAYS = 30 * 24 * 3600;

/**
 * The discovered feed: every open posting PrepOS has seen. Kept apart from the tracker (`jobs`) so thousands
 * of discovered roles never count against its cap. Rows expire 30 days after they were last seen, which
 * also clears closed postings and companies you stop syncing.
 */
const postingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    source: { type: String, enum: POSTING_SOURCES, required: true },
    sourceId: { type: String, required: true },
    externalId: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    company: { type: String, required: true, maxlength: 160 },
    tier: { type: String, default: "" },
    companyId: { type: String, default: null },
    location: { type: String, default: "", maxlength: 300 },
    remote: { type: Boolean, default: null },
    department: { type: String, default: "", maxlength: 100 },
    postedAt: { type: Date, default: null },
    url: { type: String, required: true, maxlength: 2000 },
    applyUrl: { type: String, required: true, maxlength: 2000 },
    jd: { type: String, default: "", maxlength: JD_STORE_MAX + 20 },
    tags: { type: [String], default: [] },
    /** Canonical skill terms in the title and description, computed once when stored, so matching never has to read the description. */
    terms: { type: [String], default: [] },
    /** Minimum years of experience the description asks for (null when it does not say). */
    yearsMin: { type: Number, default: null },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
    dismissed: { type: Boolean, default: false },
    /** Already included in a new-jobs alert, so it is never announced twice. */
    alerted: { type: Boolean, default: false },
    /** Set when you saved it to the tracker. */
    savedJobId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: false },
);
postingSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: THIRTY_DAYS });
postingSchema.index({ closedAt: 1, postedAt: -1 });
postingSchema.index({ sourceId: 1, closedAt: 1 });
postingSchema.index({ firstSeenAt: -1 });

/** A source PrepOS syncs (built-in from careers.json, one you added, or an aggregator) and how it is doing. */
const sourceSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, maxlength: 120 },
    kind: { type: String, enum: ["board", "aggregator", "scrape", "push"], required: true },
    /** Career page address for a "scrape" source. */
    url: { type: String, default: "", maxlength: 500 },
    ats: { type: String, required: true },
    slug: { type: String, default: "", maxlength: 80 },
    tier: { type: String, default: "" },
    companyId: { type: String, default: null },
    custom: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    lastTriedAt: { type: Date, default: null },
    lastOkAt: { type: Date, default: null },
    lastCount: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    lastError: { type: String, default: "", maxlength: 300 },
    cooldownUntil: { type: Date, default: null },
    etag: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true },
);
sourceSchema.index({ enabled: 1, lastTriedAt: 1 });

/** Your job-search preferences (a single document). */
const prefsSchema = new Schema({ _id: { type: String, required: true }, data: { type: Schema.Types.Mixed, default: {} } }, { versionKey: false });

export type JobPostingRow = InferSchemaType<typeof postingSchema>;
export type JobSourceRow = InferSchemaType<typeof sourceSchema>;
export const JobPosting: Model<JobPostingRow> = models.JobPosting ?? model("JobPosting", postingSchema);
export const JobSource = (models.JobSource ?? model("JobSource", sourceSchema, "jobsources")) as Model<JobSourceRow>;
export const JobPrefsDoc = (models.JobPrefsDoc ?? model("JobPrefsDoc", prefsSchema, "jobprefs")) as Model<{ _id: string; data: unknown }>;
