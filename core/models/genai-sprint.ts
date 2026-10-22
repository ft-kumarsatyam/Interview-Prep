import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** One completion row per sprint task. Keyed by stable task id (d03t1), never array index. */
const genaiSprintTaskSchema = new Schema(
  {
    taskId: { type: String, required: true, match: /^d\d+t\d+$/ },
    completedOn: { type: String, required: true },
  },
  { timestamps: true },
);
ownerScope(genaiSprintTaskSchema, [{ fields: { taskId: 1 } }]);

/** Optional pin: prefer tasks from this block id (head, w1, …) when picking "next". */
const genaiSprintPrefsSchema = new Schema(
  {
    pinnedBlockId: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(genaiSprintPrefsSchema);

export type GenaiSprintTaskRow = InferSchemaType<typeof genaiSprintTaskSchema>;
export type GenaiSprintPrefsRow = InferSchemaType<typeof genaiSprintPrefsSchema>;

export const GenaiSprintTask: Model<GenaiSprintTaskRow> =
  models.GenaiSprintTask ?? model("GenaiSprintTask", genaiSprintTaskSchema);
export const GenaiSprintPrefs: Model<GenaiSprintPrefsRow> =
  models.GenaiSprintPrefs ?? model("GenaiSprintPrefs", genaiSprintPrefsSchema);
