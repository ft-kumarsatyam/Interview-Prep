import type { ZodType } from "zod";
import { startOfNextLocalDayMs } from "@/lib/domain/dates";
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
} from "@/lib/domain/llm-router";
import { AllProvidersFailedError, LlmHttpError, LlmInvalidOutputError, PaidConfirmRequiredError } from "./errors";
import { createLlm } from "./json-provider";
import type { ProviderDef } from "./providers";
import type { LlmStore } from "./store";
import type { LlmProvider } from "./types";

export const DEFAULT_DEADLINE_MS = 20_000;

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

        let reserved = false;
        if (def.paid) {
          const decision = paidDecision({
            policy,
            settings: deps.paid,
            usedToday: await deps.store.paidUsedToday(),
            approvedToday: await deps.store.isPaidApprovedToday(),
            once: !!deps.paidOnce,
          });
          if (decision.kind === "blocked") {
            attempts.push({ provider: def.label, outcome: `not used (${decision.reason})` });
            continue;
          }
          if (decision.kind === "needs_confirm") throw new PaidConfirmRequiredError(decision.used, decision.cap);
          reserved = await deps.store.reservePaid(deps.paid.dailyCap);
          if (!reserved) {
            attempts.push({ provider: def.label, outcome: "not used (daily cap)" });
            continue;
          }
        }

        const provider = deps.make ? deps.make(def) : createLlm({ ...def.cfg, signal: AbortSignal.timeout(Math.max(1, deadlineMs - (clock() - startedAt))) });
        if (!provider) continue;
        try {
          const out = await provider.generateJson(prompt, schema);
          if (state.status !== "closed" || state.fails > 0) await deps.store.saveState(id, afterSuccess());
          await deps.store.recordUsage({ provider: id, feature: deps.feature, calls: 1 });
          last = def.label;
          return out;
        } catch (err) {
          if (reserved) await deps.store.releasePaid();
          const failure = failureOf(err);
          await deps.store.recordUsage({ provider: id, feature: deps.feature, calls: 1, fails: 1 });
          const next = afterFailure(state, failure, nowMs, nextDayMs);
          if (next !== state) await deps.store.saveState(id, next);
          attempts.push({ provider: def.label, outcome: failure.kind });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
  };
}
