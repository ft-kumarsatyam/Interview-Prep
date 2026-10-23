import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One finished run of the Playground, a DSA problem or the DB Lab: counts and time only, never the code or its output. */
const runLogSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["playground", "dsa", "dblab"] },
    ref: { type: String, required: true, maxlength: 120 },
    language: { type: String, required: true, maxlength: 20 },
    action: { type: String, required: true, enum: ["run", "submit", "check"] },
    ok: { type: Boolean, required: true },
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    ms: { type: Number, default: 0 },
    on: { type: String, required: true },
  },
  { timestamps: true },
);
ownerScope(runLogSchema);
runLogSchema.index({ ownerId: 1, kind: 1, ref: 1, createdAt: -1 });

/** A SQL or Mongo query you saved in the DB Lab. */
const dbLabQuerySchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    sql: { type: String, required: true, maxlength: 8000 },
    mode: { type: String, required: true, enum: ["sql", "postgres", "mongo"] },
    dataset: { type: String, default: "", maxlength: 40 },
  },
  { timestamps: true },
);
ownerScope(dbLabQuerySchema);
dbLabQuerySchema.index({ ownerId: 1, updatedAt: -1 });

/** Which DB Lab challenges you solved, so progress follows you to another browser. Keyed by challenge id. */
const dbLabProgressSchema = new Schema(
  {
    challengeId: { type: String, required: true, maxlength: 80 },
    mode: { type: String, required: true, enum: ["sql", "postgres", "mongo"] },
    solvedOn: { type: String, required: true },
    attempts: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);
ownerScope(dbLabProgressSchema, [{ fields: { challengeId: 1 } }]);

export type RunLogRow = InferSchemaType<typeof runLogSchema>;
export type DbLabQueryRow = InferSchemaType<typeof dbLabQuerySchema>;
export type DbLabProgressRow = InferSchemaType<typeof dbLabProgressSchema>;

export const RunLog: Model<RunLogRow> = models.RunLog ?? model("RunLog", runLogSchema);
export const DbLabQuery: Model<DbLabQueryRow> = models.DbLabQuery ?? model("DbLabQuery", dbLabQuerySchema);
export const DbLabProgress: Model<DbLabProgressRow> = models.DbLabProgress ?? model("DbLabProgress", dbLabProgressSchema);
