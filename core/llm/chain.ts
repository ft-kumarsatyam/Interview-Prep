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
import { withSpan } from "@/core/observability/trace";
import { estimateTokens } from "@/modules/ai/domain/ai-metrics";
import { overBudget } from "@/modules/ai/domain/key-rotation";
import { AllProvidersFailedError, LlmHttpError, LlmInvalidOutputError, PaidConfirmRequiredError } from "@/core/llm/errors";
import { createLlm } from "@/core/llm/json-provider";
import type { ProviderDef } from "@/core/llm/providers";
import type { LlmStore, UsageDelta } from "@/core/llm/store";
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
  /** Lifetime tokens one key may use; a key at or over it is skipped. 0 or unset = no limit. */
  keyBudget?: number;
}

const providerOf = (def: ProviderDef) => def.provider ?? def.id;
const slotLabel = (def: ProviderDef) => ((def.keyCount ?? 1) > 1 ? `${def.label} key ${(def.keyIndex ?? 0) + 1}` : def.label);

/** Slots in try order: providers ordered by the feature policy (paid ones last), each provider's keys in the order you listed them. */
export function orderSlots(defs: readonly ProviderDef[], feature: AiFeature): ProviderDef[] {
  const providers = [...new Set(defs.map(providerOf))];
  const paidIds = [...new Set(defs.filter((d) => d.paid).map(providerOf))];
  return planOrder(providers, FEATURE_POLICY[feature], paidIds).flatMap((p) => defs.filter((d) => providerOf(d) === p));
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
 * One LlmProvider that tries each configured provider key in order, remembering which are rate
 * limited, out of daily quota, rejecting the key or over their token budget. Free providers go
 * first; paid ones are the last resort, never used by background work, and only after you confirm.
 */
export function createChain(deps: ChainDeps): LlmProvider {
  let last: string | undefined;
  const policy = FEATURE_POLICY[deps.feature];
  const slots = orderSlots(deps.defs, deps.feature);
  const budget = deps.keyBudget ?? 0;

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

  /** Per-request snapshot: remembered states, key token totals and the day boundary. */
  async function begin() {
    const now = deps.now?.() ?? new Date();
    const tracksKeys = budget > 0 && slots.some((d) => d.fingerprint);
    return {
      nowMs: now.getTime(),
      nextDayMs: startOfNextLocalDayMs(now, deps.timeZone),
      states: await deps.store.loadStates(),
      tokens: tracksKeys ? await deps.store.keyTokens() : {},
    };
  }

  function unavailable(def: ProviderDef, state: ProviderState, tokens: Record<string, number>, nowMs: number): string | null {
    if (!isAvailable(state, nowMs)) return describeState(state);
    if (def.fingerprint && overBudget(tokens[def.fingerprint] ?? 0, budget)) return "key token budget used up";
    return null;
  }

  async function succeeded(def: ProviderDef, state: ProviderState, usage: Omit<UsageDelta, "provider" | "feature" | "calls">) {
    if (state.status !== "closed" || state.fails > 0) await deps.store.saveState(def.id, afterSuccess());
    await deps.store.recordUsage({ provider: providerOf(def), feature: deps.feature, calls: 1, ...usage });
    const used = (usage.tokensIn ?? 0) + (usage.tokensOut ?? 0);
    if (def.fingerprint && used > 0) await deps.store.addKeyTokens(def.fingerprint, providerOf(def), used);
    last = def.label;
  }

  async function failed(def: ProviderDef, state: ProviderState, err: unknown, latencyMs: number, nowMs: number, nextDayMs: number) {
    const failure = failureOf(err);
    await deps.store.recordUsage({ provider: providerOf(def), feature: deps.feature, calls: 1, fails: 1, latencyMs });
    const next = afterFailure(state, failure, nowMs, nextDayMs);
    if (next !== state) await deps.store.saveState(def.id, next);
    return failure;
  }

  return {
    name: "chain",
    get lastProvider() {
      return last;
    },
    async generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> {
      const { nowMs, nextDayMs, states, tokens } = await begin();
      const attempts: Array<{ provider: string; outcome: string }> = [];
      const clock = deps.clock ?? Date.now;
      const startedAt = clock();
      const deadlineMs = deps.deadlineMs ?? DEFAULT_DEADLINE_MS;

      for (const def of slots) {
        const label = slotLabel(def);
        if (clock() - startedAt >= deadlineMs) {
          attempts.push({ provider: label, outcome: "not tried (request deadline)" });
          break;
        }
        const state = states[def.id] ?? INITIAL_STATE;
        const why = unavailable(def, state, tokens, nowMs);
        if (why) {
          attempts.push({ provider: label, outcome: why });
          continue;
        }

        const gated = await gate(def);
        if (gated.skip) {
          attempts.push({ provider: label, outcome: gated.skip });
          continue;
        }
        const reserved = gated.reserved;

        const provider = deps.make ? deps.make(def) : createLlm({ ...def.cfg, signal: AbortSignal.timeout(Math.max(1, deadlineMs - (clock() - startedAt))) });
        if (!provider) continue;
        const callStart = clock();
        try {
          const out = await withSpan("llm.generate", { "llm.provider": providerOf(def), "llm.feature": deps.feature }, () => provider.generateJson(prompt, schema));
          await succeeded(def, state, {
            latencyMs: Math.max(0, clock() - callStart),
            tokensIn: estimateTokens(prompt),
            tokensOut: estimateTokens(JSON.stringify(out)),
            failover: attempts.length > 0,
          });
          return out;
        } catch (err) {
          if (reserved) await deps.store.releasePaid();
          const failure = await failed(def, state, err, Math.max(0, clock() - callStart), nowMs, nextDayMs);
          attempts.push({ provider: label, outcome: failure.kind });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
    /**
     * Streams a plain-text reply from the first provider that can. Failover only happens before the first chunk (after
     * that the user has already seen text); a mid-stream failure is recorded and rethrown. First-token latency is a metric.
     */
    async *streamText(prompt: string): AsyncGenerator<string> {
      const { nowMs, nextDayMs, states, tokens } = await begin();
      const attempts: Array<{ provider: string; outcome: string }> = [];
      const clock = deps.clock ?? Date.now;
      const startedAt = clock();
      const deadlineMs = deps.streamDeadlineMs ?? DEFAULT_STREAM_DEADLINE_MS;

      for (const def of slots) {
        const label = slotLabel(def);
        if (clock() - startedAt >= deadlineMs) {
          attempts.push({ provider: label, outcome: "not tried (request deadline)" });
          break;
        }
        const state = states[def.id] ?? INITIAL_STATE;
        const why = unavailable(def, state, tokens, nowMs);
        if (why) {
          attempts.push({ provider: label, outcome: why });
          continue;
        }
        const gated = await gate(def);
        if (gated.skip) {
          attempts.push({ provider: label, outcome: gated.skip });
          continue;
        }
        const reserved = gated.reserved;
        const provider = deps.make ? deps.make(def) : createLlm({ ...def.cfg, signal: AbortSignal.timeout(Math.max(1, deadlineMs - (clock() - startedAt))) });
        if (!provider?.streamText) {
          if (reserved) await deps.store.releasePaid();
          attempts.push({ provider: label, outcome: "cannot stream" });
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
          await succeeded(def, state, {
            latencyMs: Math.max(0, clock() - callStart),
            firstTokenMs,
            tokensIn: estimateTokens(prompt),
            tokensOut: estimateTokens(produced),
            failover: attempts.length > 0,
          });
          return;
        } catch (err) {
          if (reserved) await deps.store.releasePaid();
          const failure = await failed(def, state, err, Math.max(0, clock() - callStart), nowMs, nextDayMs);
          if (firstTokenMs !== undefined) throw err; // text was already sent: cannot switch provider now
          attempts.push({ provider: label, outcome: failure.kind });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
  };
}
