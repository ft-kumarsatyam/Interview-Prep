import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/** Seeded from data/dsa-problems.json. Never edited by the app. */
const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    leetcodeId: { type: Number, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    pattern: { type: String, required: true },
    track: { type: String, enum: ["main", "js", "sql"], required: true },
    tier: { type: String, enum: ["core", "extended"], required: true },
    url: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: false },
);
problemSchema.index({ track: 1, order: 1 });

/** Seeded from data/syllabus.json. Subtopic id = `${topicId}:${index}`. */
export interface TopicDoc {
  topicId: string;
  track: string;
  week: number;
  level: number;
  title: string;
  position: number;
  resources: string[];
  subtopics: Array<{ id: string; title: string }>;
}

const topicSchema = new Schema<TopicDoc>(
  {
    topicId: { type: String, required: true, unique: true },
    track: { type: String, required: true },
    week: { type: Number, required: true },
    level: { type: Number, required: true },
    title: { type: String, required: true },
    position: { type: Number, required: true },
    resources: { type: [String], default: [] },
    subtopics: {
      type: [{ id: { type: String, required: true }, title: { type: String, required: true }, _id: false }],
      default: [],
    },
  },
  { timestamps: false },
);
topicSchema.index({ week: 1, position: 1 });

export type ProblemDoc = InferSchemaType<typeof problemSchema>;

export const Problem: Model<ProblemDoc> = models.Problem ?? model("Problem", problemSchema);
export const Topic: Model<TopicDoc> = models.Topic ?? model("Topic", topicSchema);
