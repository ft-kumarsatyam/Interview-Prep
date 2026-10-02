import type { AiFeature, ProviderId, ProviderState } from "@/lib/domain/llm-router";

export interface UsageDelta {
  /** A provider, or "cache" for answers served without calling one. */
  provider: ProviderId | "cache";
  feature: AiFeature;
  calls?: number;
  fails?: number;
  cacheHits?: number;
}

/**
 * Everything the chain needs to remember between calls. Serverless instances share no
 * memory, so the real implementation (lib/services/llm-store.ts) keeps it in Mongo.
 */
export interface LlmStore {
  loadStates(): Promise<Partial<Record<ProviderId, ProviderState>>>;
  saveState(id: ProviderId, state: ProviderState): Promise<void>;
  recordUsage(delta: UsageDelta): Promise<void>;
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
  states: Partial<Record<ProviderId, ProviderState>> = {};
  usage: UsageDelta[] = [];
  paidCalls = 0;
  approved = false;

  async loadStates() {
    return { ...this.states };
  }
  async saveState(id: ProviderId, state: ProviderState) {
    this.states[id] = state;
  }
  async recordUsage(delta: UsageDelta) {
    this.usage.push(delta);
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
