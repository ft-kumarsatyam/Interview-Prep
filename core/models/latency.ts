import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Daily latency histogram for a named server operation (`dashboard`, ...), one row per `${date}|${name}`. The same
 * bucket scheme as `aiusages` (modules/ai/domain/ai-metrics.ts), so a percentile is read from counters. Shared, not
 * owner scoped: it measures the system.
 */
const latencySchema = new Schema(
  {
    _id: { type: String, required: true },
    date: { type: String, required: true },
    name: { type: String, required: true },
    count: { type: Number, default: 0 },
    sumMs: { type: Number, default: 0 },
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`b${i}`, { type: Number, default: 0 }])),
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
latencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
latencySchema.index({ date: 1, name: 1 });

export type LatencyRow = InferSchemaType<typeof latencySchema>;
export const LatencyMetric: Model<LatencyRow> = models.LatencyMetric ?? model("LatencyMetric", latencySchema);
