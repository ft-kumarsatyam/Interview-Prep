import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { RESUME_TEXT_MAX } from "@/modules/resume/domain/resume";

/**
 * Your resume. One `base` document plus tailored `version`s (one per job) and `profile` snapshots (your LinkedIn/Naukri page text, audited like a resume). Only text is stored: the
 * structured form is re-parsed when needed, and the text is capped so the 512 MB Atlas M0 stays safe.
 */
const resumeSchema = new Schema(
  {
    kind: { type: String, enum: ["base", "version", "profile"], required: true },
    label: { type: String, default: "My resume", maxlength: 120 },
    text: { type: String, required: true, maxlength: RESUME_TEXT_MAX },
    /** For a version: the job it was tailored to. */
    company: { type: String, default: "", maxlength: 120 },
    role: { type: String, default: "", maxlength: 160 },
    jd: { type: String, default: "", maxlength: 20_000 },
  },
  { timestamps: true },
);
resumeSchema.index({ kind: 1, updatedAt: -1 });

export type ResumeRow = InferSchemaType<typeof resumeSchema>;
export const Resume: Model<ResumeRow> = models.Resume ?? model("Resume", resumeSchema);
