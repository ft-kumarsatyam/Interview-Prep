import { ownerScope } from "@/core/db/owner-scope";
import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const capturedNoteSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 20_000, default: "" },
    excerpt: { type: String, required: true, maxlength: 8_000 },
    source: {
      href: { type: String, required: true, maxlength: 500 },
      title: { type: String, required: true, maxlength: 200 },
      kind: { type: String, enum: ["lesson", "article", "course", "problem", "design", "interview", "other"], required: true },
      heading: { type: String, maxlength: 200, default: "" },
    },
    tags: { type: [String], default: [] },
    highlightColor: { type: String, enum: ["yellow", "blue", "green", "pink", "purple"], default: "yellow" },
    reviewOn: { type: String, default: null },
    flashcard: {
      question: { type: String, maxlength: 500 },
      answer: { type: String, maxlength: 1_500 },
    },
  },
  { timestamps: true },
);

ownerScope(capturedNoteSchema);
capturedNoteSchema.index({ updatedAt: -1 });
capturedNoteSchema.index({ tags: 1, updatedAt: -1 });
capturedNoteSchema.index({ reviewOn: 1 });

export type CapturedNoteDoc = InferSchemaType<typeof capturedNoteSchema>;
export const CapturedNote: Model<CapturedNoteDoc> = models.CapturedNote ?? model("CapturedNote", capturedNoteSchema);
