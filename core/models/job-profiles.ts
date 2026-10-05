import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";
import { LEVELS } from "@/modules/jobs/domain/job-match";

/** A named job-search profile (roles, places, experience, keywords). Owner-scoped; at most a handful per owner. */
const jobProfileSchemaDef = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    roles: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    remoteOk: { type: Boolean, default: true },
    level: { type: String, enum: LEVELS, default: "any" },
    tiers: { type: [String], default: [] },
    excludeCompanies: { type: [String], default: [] },
    minScore: { type: Number, default: 60, min: 0, max: 100 },
    experienceYears: { type: Number, default: null, min: 0, max: 40 },
    mustKeywords: { type: [String], default: [] },
    excludeKeywords: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);
ownerScope(jobProfileSchemaDef, [{ fields: { name: 1 } }]);

export type JobProfileDoc = InferSchemaType<typeof jobProfileSchemaDef>;
export const JobProfileModel: Model<JobProfileDoc> = models.JobProfile ?? model("JobProfile", jobProfileSchemaDef);
