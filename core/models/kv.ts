import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { EVENT_TTL_SEC } from "@/core/kv/types";

/** Short-lived shared state (locks, counters, caches). Rows vanish after `exp`. */
const kvSchema = new Schema({ _id: { type: String, required: true }, v: { type: String, default: "", maxlength: 200_000 }, n: { type: Number, default: 0 }, exp: { type: Date, required: true } }, { versionKey: false });
kvSchema.index({ exp: 1 }, { expireAfterSeconds: 0 });

/** The recent events of a channel, for server-sent events. */
const kvEventSchema = new Schema({ channel: { type: String, required: true }, id: { type: Number, required: true }, data: { type: String, required: true, maxlength: 4000 }, at: { type: Date, default: Date.now } }, { versionKey: false });
kvEventSchema.index({ channel: 1, id: 1 }, { unique: true });
kvEventSchema.index({ at: 1 }, { expireAfterSeconds: EVENT_TTL_SEC });

/** One counter per channel so event ids only ever go up. No TTL: resetting it would let ids go backwards. */
const kvSeqSchema = new Schema({ _id: { type: String, required: true }, n: { type: Number, default: 0 } }, { versionKey: false });

export type KvDocRow = InferSchemaType<typeof kvSchema>;
export const KvDoc: Model<KvDocRow> = models.KvDoc ?? model("KvDoc", kvSchema, "kv");
export const KvEventDoc = (models.KvEventDoc ?? model("KvEventDoc", kvEventSchema, "kvevents")) as Model<InferSchemaType<typeof kvEventSchema>>;
export const KvSeq = (models.KvSeq ?? model("KvSeq", kvSeqSchema, "kvseq")) as Model<InferSchemaType<typeof kvSeqSchema>>;
