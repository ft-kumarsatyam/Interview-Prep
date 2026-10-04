import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Your decision about one backlog item: snoozed until a day, or dismissed for good. Keyed by the item key (`dsa:two-sum`). */
const backlogStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, maxlength: 200 },
    status: { type: String, enum: ["snoozed", "dismissed"], required: true },
    /** For a snooze, the first day the item comes back (YYYY-MM-DD). */
    until: { type: String, default: null },
  },
  { timestamps: true },
);

/** An item queued for a day, either by the daily budget (auto) or by you (manual). Completion comes from real progress, not from here. */
const backlogPullSchema = new Schema(
  {
    date: { type: String, required: true },
    key: { type: String, required: true, maxlength: 200 },
    source: { type: String, enum: ["auto", "manual"], required: true },
  },
  { timestamps: true },
);
backlogPullSchema.index({ date: 1, key: 1 }, { unique: true });

export type BacklogStateDoc = InferSchemaType<typeof backlogStateSchema>;
export type BacklogPullDoc = InferSchemaType<typeof backlogPullSchema>;

export const BacklogState: Model<BacklogStateDoc> = models.BacklogState ?? model("BacklogState", backlogStateSchema);
export const BacklogPull: Model<BacklogPullDoc> = models.BacklogPull ?? model("BacklogPull", backlogPullSchema);
