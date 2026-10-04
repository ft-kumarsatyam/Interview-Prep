import type { AiFeature, ProviderState } from "@/modules/ai/domain/llm-router";

export interface UsageDelta {
  /** A provider id, or "cache" for answers served without calling one. */
  provider: string;
  feature: AiFeature;
  calls?: number;
  fails?: number;
  cacheHits?: number;
  /** Wall time of one provider call. */
  latencyMs?: number;
  /** Time to the first streamed token (streaming calls only). */
  firstTokenMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  /** This call succeeded after an earlier provider failed in the same request. */
  failover?: boolean;
}

/**
 * Everything the chain needs to remember between calls. Serverless instances share no
 * memory, so the real implementation (modules/ai/services/llm-store.ts) keeps it in Mongo.
 * States are keyed by slot id (a provider, or `provider#fingerprint` for one of several keys).
 */
export interface LlmStore {
  loadStates(): Promise<Partial<Record<string, ProviderState>>>;
  saveState(id: string, state: ProviderState): Promise<void>;
  recordUsage(delta: UsageDelta): Promise<void>;
  /** Lifetime tokens per key fingerprint. */
  keyTokens(): Promise<Record<string, number>>;
  addKeyTokens(fingerprint: string, provider: string, tokens: number): Promise<void>;
  paidUsedToday(): Promise<number>;
  /** Atomically claim one paid call under `cap`. False means the cap was already reached. */
  reservePaid(cap: number): Promise<boolean>;
  /** Give a reservation back when the paid call failed (a failed call isn't charged). */
  releasePaid(): Promise<void>;
  isPaidApprovedToday(): Promise<boolean>;
  approvePaidToday(): Promise<void>;
}

/** In-memory store for tests and scripts. */
export class MemoryLlmStore implements LlmStore {
  states: Partial<Record<string, ProviderState>> = {};
  usage: UsageDelta[] = [];
  tokens: Record<string, number> = {};
  paidCalls = 0;
  approved = false;

  async loadStates() {
    return { ...this.states };
  }
  async saveState(id: string, state: ProviderState) {
    this.states[id] = state;
  }
  async recordUsage(delta: UsageDelta) {
    this.usage.push(delta);
  }
  async keyTokens() {
    return { ...this.tokens };
  }
  async addKeyTokens(fingerprint: string, _provider: string, tokens: number) {
    this.tokens[fingerprint] = (this.tokens[fingerprint] ?? 0) + tokens;
  }
  async paidUsedToday() {
    return this.paidCalls;
  }
  async reservePaid(cap: number) {
    if (cap <= 0 || this.paidCalls >= cap) return false;
    this.paidCalls++;
    return true;
  }
  async releasePaid() {
    this.paidCalls = Math.max(0, this.paidCalls - 1);
  }
  async isPaidApprovedToday() {
    return this.approved;
  }
  async approvePaidToday() {
    this.approved = true;
  }
}
