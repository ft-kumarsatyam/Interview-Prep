/**
 * Pure rules for the LLM provider chain: which providers to try in what order,
 * what a failure does to a provider's state, and when the paid last-resort provider
 * may be used. No I/O: state lives in Mongo (lib/services/llm-store.ts) because
 * serverless instances share no memory.
 */

export const PROVIDER_IDS = ["nvidia", "openrouter", "gemini", "groq", "anthropic", "custom", "openai", "meta"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Built-in providers that cost money. Always tried last and only with a visible confirmation.
 * Extra providers from LLM_EXTRA_PROVIDERS can be marked paid too (ProviderDef.paid).
 */
export const PAID_PROVIDERS: readonly string[] = ["openai", "meta"];

export const AI_FEATURES = ["background", "practice", "hint", "explain", "code-review", "answer-feedback", "generate-questions", "mock-grade", "resume-roast", "resume-tailor", "ask", "job-chat", "recruiter-email", "chat", "test"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export type ErrorKind = "rate" | "quota-day" | "auth" | "server" | "timeout" | "network" | "bad-request" | "invalid-output";

export interface ProviderState {
  status: "closed" | "cooldown" | "disabled";
  /** Epoch ms until which a cooldown lasts. */
  untilMs: number;
  /** Consecutive transient failures. */
  fails: number;
  lastError: ErrorKind | null;
}

export const INITIAL_STATE: ProviderState = { status: "closed", untilMs: 0, fails: 0, lastError: null };

const DEFAULT_RATE_COOLDOWN_SEC = 60;
const MAX_RATE_COOLDOWN_SEC = 3600;
const TRANSIENT_COOLDOWN_MS = 5 * 60_000;
const TRANSIENT_FAILS_BEFORE_COOLDOWN = 2;

export function isAvailable(state: ProviderState, nowMs: number): boolean {
  if (state.status === "disabled") return false;
  if (state.status === "cooldown") return nowMs >= state.untilMs;
  return true;
}

export function afterSuccess(): ProviderState {
  return { ...INITIAL_STATE };
}

/**
 * What a failure does to a provider.
 * - rate (429): cool down for Retry-After, else 60 s (capped at an hour).
 * - quota-day: cool down until the next local day starts.
 * - auth (401/403/bad key): disabled until you fix the key.
 * - server/timeout/network/bad-request: two in a row cool the provider down for 5 minutes.
 * - invalid-output: the model's reply was bad, not the provider: no change.
 */
export function afterFailure(
  state: ProviderState,
  failure: { kind: ErrorKind; retryAfterSec?: number },
  nowMs: number,
  nextDayStartMs: number,
): ProviderState {
  switch (failure.kind) {
    case "invalid-output":
      return state;
    case "rate": {
      const sec = Math.min(Math.max(failure.retryAfterSec ?? DEFAULT_RATE_COOLDOWN_SEC, 1), MAX_RATE_COOLDOWN_SEC);
      return { status: "cooldown", untilMs: nowMs + sec * 1000, fails: 0, lastError: "rate" };
    }
    case "quota-day":
      return { status: "cooldown", untilMs: nextDayStartMs, fails: 0, lastError: "quota-day" };
    case "auth":
      return { status: "disabled", untilMs: 0, fails: 0, lastError: "auth" };
    default: {
      const fails = state.fails + 1;
      return fails >= TRANSIENT_FAILS_BEFORE_COOLDOWN
        ? { status: "cooldown", untilMs: nowMs + TRANSIENT_COOLDOWN_MS, fails: 0, lastError: failure.kind }
        : { status: "closed", untilMs: 0, fails, lastError: failure.kind };
    }
  }
}

export interface FeaturePolicy {
  /** Providers to try first, in order, if they are configured. */
  prefer: readonly ProviderId[];
  /** "never": background work must not spend money. "confirm": paid is last resort, with a visible confirmation. */
  paid: "never" | "confirm";
}

export const FEATURE_POLICY: Record<AiFeature, FeaturePolicy> = {
  background: { prefer: [], paid: "never" },
  practice: { prefer: [], paid: "never" },
  "generate-questions": { prefer: ["gemini"], paid: "never" },
  hint: { prefer: ["groq"], paid: "confirm" },
  explain: { prefer: ["groq", "gemini"], paid: "confirm" },
  "code-review": { prefer: ["gemini"], paid: "confirm" },
  "answer-feedback": { prefer: ["gemini"], paid: "confirm" },
  "mock-grade": { prefer: ["gemini"], paid: "never" },
  // Resumes are personal data: never sent to the paid provider.
  "resume-roast": { prefer: ["gemini"], paid: "never" },
  "resume-tailor": { prefer: ["gemini"], paid: "never" },
  // Answers grounded in your notes and saved articles: never the paid provider.
  ask: { prefer: ["gemini", "groq"], paid: "never" },
  // Both read your resume: personal data, so never the paid provider.
  "job-chat": { prefer: ["gemini", "groq"], paid: "never" },
  "recruiter-email": { prefer: ["gemini"], paid: "never" },
  // The system-wide assistant reads your app data: free providers only.
  chat: { prefer: ["nvidia", "openrouter", "gemini", "groq"], paid: "never" },
  test: { prefer: [], paid: "never" },
};

/** Try order: the feature's preferred providers, then the rest of the chain, and every paid provider last. */
export function planOrder(chain: readonly string[], policy: FeaturePolicy, paidIds: readonly string[] = PAID_PROVIDERS): string[] {
  const isPaid = (id: string) => paidIds.includes(id);
  const free = chain.filter((id) => !isPaid(id));
  const preferred = policy.prefer.filter((id) => free.includes(id));
  const order = [...preferred, ...free.filter((id) => !(preferred as readonly string[]).includes(id))];
  return [...order, ...chain.filter(isPaid)];
}

export interface PaidSettings {
  enabled: boolean;
  /** Calls per day. A count, not a spend limit. */
  dailyCap: number;
  requireConfirm: boolean;
}

export const DEFAULT_PAID_SETTINGS: PaidSettings = { enabled: true, dailyCap: 20, requireConfirm: true };

export type PaidDecision =
  | { kind: "allowed" }
  | { kind: "needs_confirm"; used: number; cap: number }
  | { kind: "blocked"; reason: "never" | "disabled" | "cap" };

/**
 * May the paid provider be used for this call? Background paths never use it. Otherwise it
 * needs to be enabled and under today's cap, and unless "always allow" is off, you have to
 * confirm: for this one call (`once`), or for the rest of today (`approvedToday`).
 */
export function paidDecision(input: {
  policy: FeaturePolicy;
  settings: PaidSettings;
  usedToday: number;
  approvedToday: boolean;
  once: boolean;
}): PaidDecision {
  const { policy, settings, usedToday } = input;
  if (policy.paid === "never") return { kind: "blocked", reason: "never" };
  if (!settings.enabled) return { kind: "blocked", reason: "disabled" };
  if (usedToday >= settings.dailyCap) return { kind: "blocked", reason: "cap" };
  if (settings.requireConfirm && !input.once && !input.approvedToday) return { kind: "needs_confirm", used: usedToday, cap: settings.dailyCap };
  return { kind: "allowed" };
}

/** Classify an HTTP failure from any provider. */
export function classifyHttp(status: number, body: string, retryAfterHeader?: string | null): { kind: ErrorKind; retryAfterSec?: number } {
  const retryAfterSec = parseRetryAfter(retryAfterHeader, body);
  if (status === 429) {
    return /per[\s_-]?day|daily|requestsperday|tokensperday/i.test(body) ? { kind: "quota-day" } : { kind: "rate", ...(retryAfterSec ? { retryAfterSec } : {}) };
  }
  if (status === 401 || status === 403 || /api key not valid|invalid api key|incorrect api key|invalid_api_key/i.test(body)) return { kind: "auth" };
  // 402: out of prepaid credits. Nothing changes until you top up, so treat it like a spent daily quota; a passing Test re-enables it.
  if (status === 402) return { kind: "quota-day" };
  if (status === 408) return { kind: "timeout" };
  if (status >= 500) return { kind: "server" };
  return { kind: "bad-request" };
}

function parseRetryAfter(header: string | null | undefined, body: string): number | undefined {
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n) && n > 0) return Math.ceil(n);
  }
  // Gemini: "retryDelay": "34s". Groq: "Please try again in 7.5s" / "in 1m3.2s".
  const gemini = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  if (gemini) return Math.ceil(Number(gemini[1]));
  const groq = /try again in (?:(\d+)m)?\s*(\d+(?:\.\d+)?)s/i.exec(body);
  if (groq) return Math.ceil(Number(groq[1] ?? 0) * 60 + Number(groq[2]));
  return undefined;
}
