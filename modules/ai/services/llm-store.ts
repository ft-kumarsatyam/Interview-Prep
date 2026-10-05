import { connectDb } from "@/core/db";
import { recordAiUsage } from "@/core/observability/metrics";
import { toLocalDate } from "@/core/domain/dates";
import { latencyBucket } from "@/modules/ai/domain/ai-metrics";
import type { ProviderState } from "@/modules/ai/domain/llm-router";
import type { LlmStore, UsageDelta } from "@/core/llm/store";
import { AiUsage, LlmKeyUsage, LlmState, PaidApproval, PaidCap } from "@/core/models/ai";

const USAGE_TTL_MS = 90 * 86_400_000;
/** A provider id, optionally `#fingerprint` for one of several keys. */
const SLOT_ID = /^[a-z][a-z0-9-]{1,30}(#[0-9a-f]{6,16})?(#m[0-9a-f]{10})?$/;
const APPROVAL_TTL_MS = 3 * 86_400_000;

/** The counters one call adds: calls, failures, tokens, failovers and its latency histogram buckets. */
export function usageIncrements(delta: UsageDelta): Record<string, number> {
  const inc: Record<string, number> = { calls: delta.calls ?? 0, fails: delta.fails ?? 0, cacheHits: delta.cacheHits ?? 0 };
  if (delta.tokensIn) inc.tokensIn = delta.tokensIn;
  if (delta.tokensOut) inc.tokensOut = delta.tokensOut;
  if (delta.failover) inc.failovers = 1;
  if (delta.latencyMs !== undefined) {
    inc.latCount = 1;
    inc.latSumMs = Math.round(delta.latencyMs);
    inc[`lat${latencyBucket(delta.latencyMs)}`] = 1;
  }
  if (delta.firstTokenMs !== undefined) inc[`ttft${latencyBucket(delta.firstTokenMs)}`] = 1;
  return inc;
}

export const usageId = (date: string, provider: string, feature: string) => `${date}|${provider}|${feature}`;

const isDuplicateKey = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/** The Mongo-backed LlmStore. `now` is injectable so tests control the day. */
export function mongoLlmStore(timeZone: string, now: () => Date = () => new Date()): LlmStore {
  const today = () => toLocalDate(now(), timeZone);
  const expiry = (ms: number) => new Date(now().getTime() + ms);

  return {
    async loadStates() {
      await connectDb();
      const rows = await LlmState.find().lean();
      const out: Partial<Record<string, ProviderState>> = {};
      for (const r of rows) {
        const id = String(r._id);
        if (!SLOT_ID.test(id)) continue;
        out[id] = { status: r.status ?? "closed", untilMs: r.untilMs ?? 0, fails: r.fails ?? 0, lastError: (r.lastError as ProviderState["lastError"]) ?? null };
      }
      return out;
    },

    async keyTokens() {
      await connectDb();
      const rows = await LlmKeyUsage.find({}, { fingerprint: 1, tokens: 1 }).lean();
      return Object.fromEntries(rows.map((r) => [r.fingerprint, r.tokens ?? 0]));
    },

    async addKeyTokens(fingerprint, provider, tokens) {
      if (tokens <= 0) return;
      await connectDb();
      await LlmKeyUsage.updateOne({ fingerprint }, { $inc: { tokens: Math.round(tokens) }, $set: { provider, lastUsedAt: now() } }, { upsert: true });
    },

    async saveState(id, state) {
      await connectDb();
      await LlmState.updateOne({ _id: id }, { $set: state }, { upsert: true });
    },

    async recordUsage(delta: UsageDelta) {
      recordAiUsage(delta);
      await connectDb();
      const date = today();
      await AiUsage.updateOne(
        { _id: usageId(date, delta.provider, delta.feature) },
        { $inc: usageIncrements(delta), $setOnInsert: { date, provider: delta.provider, feature: delta.feature, expiresAt: expiry(USAGE_TTL_MS) } },
        { upsert: true },
      );
    },

    async paidUsedToday() {
      await connectDb();
      const row = await PaidCap.findById(today(), { calls: 1 }).lean();
      return row?.calls ?? 0;
    },

    /**
     * One conditional increment keyed by `_id`: the filter only matches while `calls < cap`.
     * When the day's row already sits at the cap the upsert tries to insert the same `_id` and
     * fails with E11000, so concurrent callers can never overspend, with no read-then-write race.
     */
    async reservePaid(cap) {
      if (cap <= 0) return false;
      await connectDb();
      try {
        await PaidCap.updateOne({ _id: today(), calls: { $lt: cap } }, { $inc: { calls: 1 }, $setOnInsert: { expiresAt: expiry(USAGE_TTL_MS) } }, { upsert: true });
        return true;
      } catch (err) {
        if (isDuplicateKey(err)) return false;
        throw err;
      }
    },

    async releasePaid() {
      await connectDb();
      await PaidCap.updateOne({ _id: today(), calls: { $gt: 0 } }, { $inc: { calls: -1 } });
    },

    async isPaidApprovedToday() {
      await connectDb();
      return !!(await PaidApproval.exists({ _id: today() }));
    },

    async approvePaidToday() {
      await connectDb();
      await PaidApproval.updateOne({ _id: today() }, { $setOnInsert: { expiresAt: expiry(APPROVAL_TTL_MS) } }, { upsert: true });
    },
  };
}
