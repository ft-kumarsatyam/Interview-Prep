import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { ownerScope } from "@/core/db/owner-scope";

/**
 * Per-provider health for the LLM chain. Kept in Mongo because serverless instances
 * share no memory. Derived data: not part of the backup export.
 */
const llmStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, enum: ["closed", "cooldown", "disabled"], default: "closed" },
    untilMs: { type: Number, default: 0 },
    fails: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

/** Validated AI answers, keyed by a hash of (feature, prompt version, input). Never stores prompts or failures. */
const aiCacheSchema = new Schema(
  {
    _id: { type: String, required: true },
    feature: { type: String, required: true },
    provider: { type: String, default: null },
    output: { type: Schema.Types.Mixed, required: true },
    hits: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Daily counters per provider and feature. `_id` is `${date}|${provider}|${feature}`, so upserts can't duplicate. */
const aiUsageSchema = new Schema(
  {
    _id: { type: String, required: true },
    date: { type: String, required: true },
    provider: { type: String, required: true },
    feature: { type: String, required: true },
    calls: { type: Number, default: 0 },
    fails: { type: Number, default: 0 },
    cacheHits: { type: Number, default: 0 },
    /** Calls that only succeeded after an earlier provider failed in the same request. */
    failovers: { type: Number, default: 0 },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    latCount: { type: Number, default: 0 },
    latSumMs: { type: Number, default: 0 },
    /** Latency and first-token histograms, one counter per bucket (see modules/ai/domain/ai-metrics.ts). */
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`lat${i}`, { type: Number, default: 0 }])),
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`ttft${i}`, { type: Number, default: 0 }])),
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
aiUsageSchema.index({ date: 1 });
aiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * The paid provider's call reservations for one local day (`_id` is the date). Keyed by `_id`
 * on purpose: that index always exists, so the "calls < cap" upsert can never double-insert.
 */
const paidCapSchema = new Schema(
  {
    _id: { type: String, required: true },
    calls: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
paidCapSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** "Allow the paid fallback for the rest of today". `_id` is the local date. */
const paidApprovalSchema = new Schema(
  {
    _id: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
paidApprovalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Lifetime tokens per API key, keyed by a short SHA-256 fingerprint (never the key), so a key
 * that reaches its budget (LLM_KEY_TOKEN_BUDGET) is skipped and Settings asks for a new one.
 */
const llmKeyUsageSchema = new Schema(
  {
    fingerprint: { type: String, required: true },
    provider: { type: String, required: true },
    tokens: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
ownerScope(llmKeyUsageSchema, [{ fields: { fingerprint: 1 } }]);

export type LlmStateDoc = InferSchemaType<typeof llmStateSchema>;
export type LlmKeyUsageDoc = InferSchemaType<typeof llmKeyUsageSchema>;
export type AiCacheDoc = InferSchemaType<typeof aiCacheSchema>;
export type AiUsageDoc = InferSchemaType<typeof aiUsageSchema>;

export const LlmState: Model<LlmStateDoc> = models.LlmState ?? model("LlmState", llmStateSchema);
export const AiCache: Model<AiCacheDoc> = models.AiCache ?? model("AiCache", aiCacheSchema);
export const AiUsage: Model<AiUsageDoc> = models.AiUsage ?? model("AiUsage", aiUsageSchema);
export const LlmKeyUsage: Model<LlmKeyUsageDoc> = models.LlmKeyUsage ?? model("LlmKeyUsage", llmKeyUsageSchema);
export const PaidCap = models.PaidCap ?? model("PaidCap", paidCapSchema);
export const PaidApproval = models.PaidApproval ?? model("PaidApproval", paidApprovalSchema);
