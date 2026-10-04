import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

import { PLAN_CHANGE_TYPES } from "@/modules/planner/domain/plan-changes";
import { INTAKE_STEPS, INTAKE_VERSION, LEVELS, TIERS } from "@/modules/planner/domain/planner-intake";
import { SNAPSHOT_REASONS } from "@/modules/planner/domain/planner-snapshot";
import { STUDY_KINDS } from "@/modules/planner/domain/study";

/** Append-only history of every decision that moved the plan, with the reason. */
const planChangeSchema = new Schema(
  {
    /** Local calendar date (APP_TIMEZONE) the change was made. */
    date: { type: String, required: true },
    type: { type: String, enum: PLAN_CHANGE_TYPES, required: true },
    summary: { type: String, required: true, maxlength: 400 },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    /** Makes automatic entries (carry-over) idempotent. */
    dedupeKey: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ownerScope(planChangeSchema, [{ fields: { dedupeKey: 1 }, options: { partialFilterExpression: { dedupeKey: { $type: "string" } } } }]);
planChangeSchema.index({ createdAt: -1 });


/** Time you actually spent studying: the timer or a manual entry. Study time is measured here, never inferred from solves. */
const studySessionSchema = new Schema(
  {
    date: { type: String, required: true },
    minutes: { type: Number, required: true, min: 1, max: 720 },
    kind: { type: String, enum: STUDY_KINDS, required: true },
    note: { type: String, maxlength: 200, default: "" },
    source: { type: String, enum: ["timer", "manual"], default: "manual" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ownerScope(studySessionSchema);
studySessionSchema.index({ date: 1 });

export const PLANNER_INTAKE_ID = "planner-intake";

/** Singleton: the guided intake's answers. Every field has a default, so a missing or partial document is valid. */
const plannerIntakeSchema = new Schema(
  {
    _id: { type: String, default: PLANNER_INTAKE_ID },
    goals: {
      targetRole: { type: String, default: "" },
      targetCompany: { type: String, default: "" },
      level: { type: String, enum: LEVELS, default: "fresher" },
      focusNotes: { type: String, default: "" },
    },
    interviewDate: { type: String, default: null },
    topicRatings: {
      type: [
        new Schema(
          {
            topicId: { type: String, required: true },
            rating: { type: Number, min: 1, max: 5, required: true },
            wantToLearn: { type: Boolean, default: false },
            tier: { type: String, enum: TIERS, default: "must" },
            diagnosticScore: { type: Number, min: 0, max: 100, default: null },
            ratedAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    availability: {
      hoursByDow: { type: [Number], default: [] },
      overrides: {
        type: [new Schema({ from: String, to: String, hours: Number }, { _id: false })],
        default: [],
      },
    },
    stepsDone: { type: [String], enum: INTAKE_STEPS, default: [] },
    /** The weekly rebalance suggestion: waits for your approval, then is applied or dismissed. One per Mon-Sun week. */
    proposal: { type: Schema.Types.Mixed, default: null },
    intakeVersion: { type: Number, default: INTAKE_VERSION },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * A saved copy of the planner (intake answers plus the planner fields in Settings), taken before a reset or restore
 * or on request. Progress is never part of it. The TTL index deletes it at `expiresAt` (60 days).
 */
const plannerSnapshotSchema = new Schema(
  {
    reason: { type: String, enum: SNAPSHOT_REASONS, required: true },
    takenOn: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    intake: { type: Schema.Types.Mixed, default: null },
    planner: {
      targetRole: { type: String, default: "" },
      targetCompany: { type: String, default: "" },
      preferredLanguage: { type: String, default: "javascript" },
      priorities: { type: [String], default: [] },
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
      hoursByDow: { type: [Number], default: [] },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ownerScope(plannerSnapshotSchema);
plannerSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
plannerSnapshotSchema.index({ createdAt: -1 });

export type PlanChangeDoc = InferSchemaType<typeof planChangeSchema>;
export type PlannerSnapshotDoc = InferSchemaType<typeof plannerSnapshotSchema>;
export const PlannerSnapshot: Model<PlannerSnapshotDoc> = models.PlannerSnapshot ?? model("PlannerSnapshot", plannerSnapshotSchema);
export type StudySessionDoc = InferSchemaType<typeof studySessionSchema>;
export type PlannerIntakeDoc = InferSchemaType<typeof plannerIntakeSchema>;

export const PlanChange: Model<PlanChangeDoc> = models.PlanChange ?? model("PlanChange", planChangeSchema);
export const StudySession: Model<StudySessionDoc> = models.StudySession ?? model("StudySession", studySessionSchema);
export const PlannerIntake: Model<PlannerIntakeDoc> = models.PlannerIntake ?? model("PlannerIntake", plannerIntakeSchema);
