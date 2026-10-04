import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { JD_MAX, JOB_SOURCES, JOB_STATUSES } from "@/modules/jobs/domain/jobs";

/** One job you are tracking. `canonicalKey` makes capturing the same posting twice a no-op. */
const jobSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    company: { type: String, required: true, maxlength: 160 },
    source: { type: String, enum: JOB_SOURCES, default: "other" },
    url: { type: String, required: true, maxlength: 2000 },
    canonicalKey: { type: String, required: true, maxlength: 300 },
    location: { type: String, default: "", maxlength: 160 },
    jd: { type: String, default: "", maxlength: JD_MAX },
    applyUrl: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: JOB_STATUSES, default: "saved" },
    statusLog: { type: [{ status: { type: String, enum: JOB_STATUSES }, on: String, _id: false }], default: [] },
    appliedOn: { type: String, default: null },
    followUpOn: { type: String, default: null },
    /** The tailored resume sent for this job, and its ATS score against the JD at the time. */
    resumeId: { type: Schema.Types.ObjectId, default: null },
    atsScore: { type: Number, default: null },
    notes: { type: String, default: "", maxlength: 2000 },
    /** The next interview: its day, which round it is and who you are talking to. Shown on the calendar. */
    interviewOn: { type: String, default: null },
    interviewRound: { type: String, default: "", maxlength: 60 },
    contact: { type: String, default: "", maxlength: 200 },
    /** Emails you sent to a recruiter about this job from PrepOS (address, subject, when). Never the body. */
    outreach: { type: [{ to: { type: String, maxlength: 254 }, subject: { type: String, maxlength: 200 }, at: Date, _id: false }], default: [] },
  },
  { timestamps: true },
);
ownerScope(jobSchema, [{ fields: { canonicalKey: 1 } }]);
jobSchema.index({ status: 1, updatedAt: -1 });
jobSchema.index({ followUpOn: 1 });
jobSchema.index({ interviewOn: 1 });

export type JobRow = InferSchemaType<typeof jobSchema>;
export const Job: Model<JobRow> = models.Job ?? model("Job", jobSchema);
