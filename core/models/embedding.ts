import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";

/**
 * One searchable chunk of a note or saved article. `hash` is the chunk's content hash, so re-indexing only embeds
 * chunks whose text changed. `vector` is absent until an embedding key is configured (keyword search works without it).
 */
const embeddingSchema = new Schema(
  {
    source: { type: String, enum: ["note", "article"], required: true },
    /** `note:<subtopicId>` or `article:<id>`. */
    ref: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 200 },
    text: { type: String, required: true, maxlength: 2000 },
    hash: { type: String, required: true },
    vector: { type: [Number], default: undefined },
    model: { type: String, default: null },
  },
  { timestamps: true },
);
ownerScope(embeddingSchema, [{ fields: { ref: 1, chunkIndex: 1 } }]);
embeddingSchema.index({ title: "text", text: "text" }, { weights: { title: 3, text: 1 }, name: "embedding_text" });

export type EmbeddingRow = InferSchemaType<typeof embeddingSchema>;
export const Embedding: Model<EmbeddingRow> = models.Embedding ?? model("Embedding", embeddingSchema);
