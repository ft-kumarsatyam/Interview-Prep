import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One row per applied migration (core/db/migrations). Shared: it describes the database, not an owner's data. */
const migrationSchema = new Schema({ _id: { type: String, required: true }, appliedAt: { type: Date, default: () => new Date() }, ms: { type: Number, default: 0 } }, { versionKey: false });

export type MigrationRow = InferSchemaType<typeof migrationSchema>;
export const MigrationDoc: Model<MigrationRow> = models.MigrationDoc ?? model("MigrationDoc", migrationSchema, "migrations");
