import type { ZodType } from "zod";
import { startOfNextLocalDayMs } from "@/core/domain/dates";
import {
  FEATURE_POLICY,
  INITIAL_STATE,
  afterFailure,
  afterSuccess,
  isAvailable,
  paidDecision,
  planOrder,
  type AiFeature,
  type ErrorKind,
  type PaidSettings,
  type ProviderState,
} from "@/modules/ai/domain/llm-router";
import { estimateTokens } from "@/modules/ai/domain/ai-metrics";
import { AllProvidersFailedError, LlmHttpError, LlmInvalidOutputError, PaidConfirmRequiredError } from "@/core/llm/errors";
import { createLlm } from "@/core/llm/json-provider";
import type { ProviderDef } from "@/core/llm/providers";
import type { LlmStore } from "@/core/llm/store";
import type { LlmProvider } from "@/core/llm/types";

export const DEFAULT_DEADLINE_MS = 20_000;
export const DEFAULT_STREAM_DEADLINE_MS = 45_000;

export interface ChainDeps {
  defs: readonly ProviderDef[];
  store: LlmStore;
  feature: AiFeature;
  paid: PaidSettings;
  timeZone: string;
  /** You confirmed paid use for this one call. */
  paidOnce?: boolean;
  now?: () => Date;
  /** Stop trying further providers once this much time has passed in one request (default 20 s). */
  deadlineMs?: number;
  /** Overall limit for a streamed reply, which legitimately takes longer than a JSON call (default 45 s). */
  streamDeadlineMs?: number;
  /** Test seam for the deadline clock (ms). */
  clock?: () => number;
  /** Test seam. */
  make?: (def: ProviderDef) => LlmProvider | null;
}

function failureOf(err: unknown): { kind: ErrorKind; retryAfterSec?: number } {
  if (err instanceof LlmHttpError) return { kind: err.kind, ...(err.retryAfterSec ? { retryAfterSec: err.retryAfterSec } : {}) };
  // Invalid JSON, empty replies and anything unrecognised: the reply was bad, not the provider.
  if (err instanceof LlmInvalidOutputError || err instanceof Error) return { kind: "invalid-output" };
  return { kind: "invalid-output" };
}

function describeState(state: ProviderState): string {
  if (state.status === "disabled") return "disabled (key rejected)";
  return `cooling down (${state.lastError ?? "limit"})`;
}

/**
 * One LlmProvider that tries each configured provider in order, remembering which are rate
 * limited, out of daily quota or rejecting the key. Free providers go first; the paid one
 * is the last resort, never used by background work, and only after you confirm.
 */
export function createChain(deps: ChainDeps): LlmProvider {
  let last: string | undefined;
  const policy = FEATURE_POLICY[deps.feature];

  /** The paid-provider rules shared by JSON and streaming calls: blocked, needs your confirmation, or a reserved call. */
  async function gate(def: ProviderDef): Promise<{ skip: string; reserved?: never } | { skip?: never; reserved: boolean }> {
    if (!def.paid) return { reserved: false };
    const decision = paidDecision({
      policy,
      settings: deps.paid,
      usedToday: await deps.store.paidUsedToday(),
      approvedToday: await deps.store.isPaidApprovedToday(),
      once: !!deps.paidOnce,
    });
    if (decision.kind === "blocked") return { skip: `not used (${decision.reason})` };
    if (decision.kind === "needs_confirm") throw new PaidConfirmRequiredError(decision.used, decision.cap);
    if (!(await deps.store.reservePaid(deps.paid.dailyCap))) return { skip: "not used (daily cap)" };
    return { reserved: true };
  }

  return {
    name: "chain",
    get lastProvider() {
      return last;
    },
    async generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> {
      const now = deps.now?.() ?? new Date();
      const nowMs = now.getTime();
      const nextDayMs = startOfNextLocalDayMs(now, deps.timeZone);
      const states = await deps.store.loadStates();
      const byId = new Map(deps.defs.map((d) => [d.id, d]));
      const attempts: Array<{ provider: string; outcome: string }> = [];
      const clock = deps.clock ?? Date.now;
      const startedAt = clock();
      const deadlineMs = deps.deadlineMs ?? DEFAULT_DEADLINE_MS;

      for (const id of planOrder(deps.defs.map((d) => d.id), policy)) {
        const def = byId.get(id)!;
        if (clock() - startedAt >= deadlineMs) {
          attempts.push({ provider: def.label, outcome: "not tried (request deadline)" });
          break;
        }
        const state = states[id] ?? INITIAL_STATE;
        if (!isAvailable(state, nowMs)) {
          attempts.push({ provider: def.label, outcome: describeState(state) });
          continue;
        }

        const gated = await gate(def);
        if (gated.skip) {
          attempts.push({ provider: def.label, outcome: gated.skip });
          continue;
        }
        const reserved = gated.reserved;

        const provider = deps.make ? deps.make(def) : createLlm({ ...def.cfg, signal: AbortSignal.timeout(Math.max(1, deadlineMs - (clock() - startedAt))) });
        if (!provider) continue;
        const callStart = clock();
        try {
          const out = await provider.generateJson(prompt, schema);
          if (state.status !== "closed" || state.fails > 0) await deps.store.saveState(id, afterSuccess());
          await deps.store.recordUsage({
            provider: id,
            feature: deps.feature,
            calls: 1,
            latencyMs: Math.max(0, clock() - callStart),
            tokensIn: estimateTokens(prompt),
            tokensOut: estimateTokens(JSON.stringify(out)),
            failover: attempts.length > 0,
          });
          last = def.label;
          return out;
        } catch (err) {
          if (reserved) await deps.store.releasePaid();
          const failure = failureOf(err);
          await deps.store.recordUsage({ provider: id, feature: deps.feature, calls: 1, fails: 1, latencyMs: Math.max(0, clock() - callStart) });
          const next = afterFailure(state, failure, nowMs, nextDayMs);
          if (next !== state) await deps.store.saveState(id, next);
          attempts.push({ provider: def.label, outcome: failure.kind });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
    /**
     * Streams a plain-text reply from the first provider that can. Failover only happens before the first chunk (after
     * that the user has already seen text); a mid-stream failure is recorded and rethrown. First-token latency is a metric.
     */
    async *streamText(prompt: string): AsyncGenerator<string> {
      const now = deps.now?.() ?? new Date();
      const nowMs = now.getTime();
      const nextDayMs = startOfNextLocalDayMs(now, deps.timeZone);
      const states = await deps.store.loadStates();
      const byId = new Map(deps.defs.map((d) => [d.id, d]));
      const attempts: Array<{ provider: string; outcome: string }> = [];
      const clock = deps.clock ?? Date.now;
      const startedAt = clock();
      const deadlineMs = deps.streamDeadlineMs ?? DEFAULT_STREAM_DEADLINE_MS;

      for (const id of planOrder(deps.defs.map((d) => d.id), policy)) {
        const def = byId.get(id)!;
        if (clock() - startedAt >= deadlineMs) {
          attempts.push({ provider: def.label, outcome: "not tried (request deadline)" });
          break;
        }
        const state = states[id] ?? INITIAL_STATE;
        if (!isAvailable(state, nowMs)) {
          attempts.push({ provider: def.label, outcome: describeState(state) });
          continue;
        }
        const gated = await gate(def);
        if (gated.skip) {
          attempts.push({ provider: def.label, outcome: gated.skip });
          continue;
        }
        const reserved = gated.reserved;
        const provider = deps.make ? deps.make(def) : createLlm({ ...def.cfg, signal: AbortSignal.timeout(Math.max(1, deadlineMs - (clock() - startedAt))) });
        if (!provider?.streamText) {
          if (reserved) await deps.store.releasePaid();
          attempts.push({ provider: def.label, outcome: "cannot stream" });
          continue;
        }

        const callStart = clock();
        let firstTokenMs: number | undefined;
        let produced = "";
        try {
          for await (const chunk of provider.streamText(prompt)) {
            if (firstTokenMs === undefined) firstTokenMs = Math.max(0, clock() - callStart);
            produced += chunk;
            yield chunk;
          }
          if (firstTokenMs === undefined) throw new LlmInvalidOutputError(`${def.label}: empty stream`);
          if (state.status !== "closed" || state.fails > 0) await deps.store.saveState(id, afterSuccess());
          await deps.store.recordUsage({
            provider: id,
            feature: deps.feature,
            calls: 1,
            latencyMs: Math.max(0, clock() - callStart),
            firstTokenMs,
            tokensIn: estimateTokens(prompt),
            tokensOut: estimateTokens(produced),
            failover: attempts.length > 0,
          });
          last = def.label;
          return;
        } catch (err) {
          if (reserved) await deps.store.releasePaid();
          const failure = failureOf(err);
          await deps.store.recordUsage({ provider: id, feature: deps.feature, calls: 1, fails: 1, latencyMs: Math.max(0, clock() - callStart) });
          const next = afterFailure(state, failure, nowMs, nextDayMs);
          if (next !== state) await deps.store.saveState(id, next);
          if (firstTokenMs !== undefined) throw err; // text was already sent: cannot switch provider now
          attempts.push({ provider: def.label, outcome: failure.kind });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
  };
}
