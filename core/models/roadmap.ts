import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** A roadmap you joined. */
const roadmapEnrollmentSchema = new Schema(
  { roadmapId: { type: String, required: true }, joinedOn: { type: String, required: true } },
  { timestamps: true },
);
ownerScope(roadmapEnrollmentSchema, [{ fields: { roadmapId: 1 } }]);

/** What you did on one roadmap node: links you opened, checklist items ticked and a manual tick. The rest is derived from other progress. */
const roadmapNodeProgressSchema = new Schema(
  {
    roadmapId: { type: String, required: true },
    nodeId: { type: String, required: true },
    readLinks: { type: [String], default: [] },
    checked: { type: [Number], default: [] },
    manualDoneOn: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(roadmapNodeProgressSchema, [{ fields: { roadmapId: 1, nodeId: 1 } }]);

export type RoadmapEnrollmentRow = InferSchemaType<typeof roadmapEnrollmentSchema>;
export type RoadmapNodeProgressRow = InferSchemaType<typeof roadmapNodeProgressSchema>;
export const RoadmapEnrollment: Model<RoadmapEnrollmentRow> = models.RoadmapEnrollment ?? model("RoadmapEnrollment", roadmapEnrollmentSchema);
export const RoadmapNodeProgress: Model<RoadmapNodeProgressRow> = models.RoadmapNodeProgress ?? model("RoadmapNodeProgress", roadmapNodeProgressSchema);
