import { createHash } from "node:crypto";
import { z } from "zod";
import { PAID_PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/modules/ai/domain/llm-router";
import { DEFAULT_KEY_TOKEN_BUDGET, slotId, splitKeys } from "@/modules/ai/domain/key-rotation";
import type { LlmConfig } from "@/core/llm/types";

export interface LlmEnv {
  LLM_PROVIDER?: "gemini" | "anthropic" | "openai-compatible";
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_BASE_URL?: string;
  LLM_CHAIN?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  NVIDIA_API_KEYS?: string;
  NVIDIA_MODEL?: string;
  OPENROUTER_API_KEYS?: string;
  OPENROUTER_MODEL?: string;
  OPENAI_API_KEYS?: string;
  OPENAI_MODEL?: string;
  META_LLAMA_API_KEY?: string;
  META_LLAMA_BASE_URL?: string;
  META_LLAMA_MODEL?: string;
  LLM_EXTRA_PROVIDERS?: string;
  LLM_KEY_TOKEN_BUDGET?: number;
}

/** Where extra providers' keys are read from (`LLM_EXTRA_<ID>_KEYS`); process.env in the app, a plain object in tests. */
export type ExtraKeyEnv = Record<string, string | undefined>;

export interface ProviderDef {
  /** The chain's state id for this key: the provider id, or `provider#fingerprint` when the provider has several keys. */
  id: string;
  /** The provider this key belongs to (a built-in id or an extra provider's id). Defaults to `id`. */
  provider?: string;
  label: string;
  /** Costs money: only used as a confirmed last resort. */
  paid: boolean;
  cfg: LlmConfig;
  /** Short SHA-256 of the key: the only way a key is identified in Mongo, logs and the UI. */
  fingerprint?: string;
  keyIndex?: number;
  keyCount?: number;
  /** The environment variable that holds this provider's keys, for Settings hints. */
  envVar?: string;
}

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENAI_BASE_URL = "https://api.openai.com/v1";
/** Current free NVIDIA API Catalog model; the former Llama 3.3 endpoint is retired. */
export const DEFAULT_NVIDIA_MODEL = "meta/muse-glimmer-30b";
/** Current free OpenRouter model; the former Llama 3.3 free variant is no longer available. */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_CHAIN: readonly ProviderId[] = ["nvidia", "openrouter", "gemini", "groq", "openai", "meta"];
/** Output cap per paid call, so one call can't run long. */
export const PAID_MAX_TOKENS = 1024;

const LABELS: Record<ProviderId, string> = {
  nvidia: "NVIDIA",
  openrouter: "OpenRouter",
  gemini: "Gemini",
  groq: "Groq",
  anthropic: "Anthropic",
  custom: "Custom (OpenAI-compatible)",
  openai: "OpenAI (paid)",
  meta: "Meta Llama (paid)",
};

const isHttps = (u: string | undefined): u is string => !!u && /^https:\/\/\S+$/.test(u);

export const keyFingerprint = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 10);

const extraSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/, "lowercase letters, digits and dashes"),
  label: z.string().min(1).max(40).optional(),
  baseUrl: z.string().regex(/^https:\/\/\S+$/, "must be https"),
  model: z.string().min(1).max(120),
  /** Unknown pricing is treated as paid, so it is only ever a confirmed last resort. */
  paid: z.boolean().default(true),
  /** Send `response_format: json_object`. Turn off for endpoints that reject it. */
  jsonMode: z.boolean().optional(),
});
export type ExtraProvider = z.infer<typeof extraSchema>;

export const extraKeysVar = (id: string) => `LLM_EXTRA_${id.toUpperCase().replace(/-/g, "_")}_KEYS`;

/** Parse LLM_EXTRA_PROVIDERS. Bad JSON or entries are dropped and reported (never with a key: keys are not in the JSON). */
export function parseExtraProviders(raw: string | undefined): { providers: ExtraProvider[]; errors: string[] } {
  if (!raw?.trim()) return { providers: [], errors: [] };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { providers: [], errors: ["LLM_EXTRA_PROVIDERS is not valid JSON"] };
  }
  if (!Array.isArray(json)) return { providers: [], errors: ["LLM_EXTRA_PROVIDERS must be a JSON array"] };
  const providers: ExtraProvider[] = [];
  const errors: string[] = [];
  json.forEach((item, i) => {
    const parsed = extraSchema.safeParse(item);
    if (!parsed.success) {
      errors.push(`LLM_EXTRA_PROVIDERS[${i}]: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
      return;
    }
    if ((PROVIDER_IDS as readonly string[]).includes(parsed.data.id) || providers.some((p) => p.id === parsed.data.id)) {
      errors.push(`LLM_EXTRA_PROVIDERS[${i}]: id "${parsed.data.id}" is already used`);
      return;
    }
    providers.push(parsed.data);
  });
  return { providers, errors };
}

export function parseChain(raw: string | undefined, extraIds: readonly string[] = []): string[] {
  if (!raw?.trim()) return [...DEFAULT_CHAIN];
  const known = [...PROVIDER_IDS, ...extraIds] as readonly string[];
  const ids = raw
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => known.includes(x));
  return [...new Set(ids)];
}

export function keyTokenBudget(e: LlmEnv): number {
  return e.LLM_KEY_TOKEN_BUDGET ?? DEFAULT_KEY_TOKEN_BUDGET;
}

interface ProviderEntry {
  id: string;
  label: string;
  paid: boolean;
  envVar: string;
  keys: string[];
  cfg: Omit<LlmConfig, "apiKey">;
}

function entries(e: LlmEnv, extraEnv: ExtraKeyEnv): Map<string, ProviderEntry> {
  const map = new Map<string, ProviderEntry>();
  const add = (id: string, envVar: string, keys: string[], cfg: Omit<LlmConfig, "apiKey">, opts: { label?: string; paid?: boolean } = {}) => {
    if (keys.length === 0) return;
    const paid = opts.paid ?? PAID_PROVIDERS.includes(id);
    map.set(id, { id, label: opts.label ?? LABELS[id as ProviderId] ?? id, paid, envVar, keys, cfg: paid ? { ...cfg, maxTokens: PAID_MAX_TOKENS } : cfg });
  };

  add("nvidia", "NVIDIA_API_KEYS", splitKeys(e.NVIDIA_API_KEYS), { provider: "openai-compatible", baseUrl: NVIDIA_BASE_URL, model: e.NVIDIA_MODEL ?? DEFAULT_NVIDIA_MODEL, jsonMode: false });
  add("openrouter", "OPENROUTER_API_KEYS", splitKeys(e.OPENROUTER_API_KEYS), { provider: "openai-compatible", baseUrl: OPENROUTER_BASE_URL, model: e.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL });
  add("gemini", "GEMINI_API_KEY", splitKeys(e.GEMINI_API_KEY), { provider: "gemini", model: e.GEMINI_MODEL });
  add("groq", "GROQ_API_KEY", splitKeys(e.GROQ_API_KEY), { provider: "openai-compatible", model: e.GROQ_MODEL, baseUrl: GROQ_BASE_URL });

  if (e.LLM_API_KEY) {
    const legacy = e.LLM_PROVIDER ?? "gemini";
    const cfg: Omit<LlmConfig, "apiKey"> = { provider: legacy, model: e.LLM_MODEL, baseUrl: e.LLM_BASE_URL };
    const keys = [e.LLM_API_KEY];
    if (legacy === "gemini" && !map.has("gemini")) add("gemini", "LLM_API_KEY", keys, cfg);
    else if (legacy === "anthropic") add("anthropic", "LLM_API_KEY", keys, cfg);
    else if (legacy === "openai-compatible") {
      const isGroq = !e.LLM_BASE_URL || /(^|\.)groq\.com/.test(e.LLM_BASE_URL);
      const id: ProviderId = isGroq ? "groq" : "custom";
      if (!map.has(id)) add(id, "LLM_API_KEY", keys, cfg);
    }
  }

  add("openai", "OPENAI_API_KEYS", splitKeys(e.OPENAI_API_KEYS), { provider: "openai-compatible", baseUrl: OPENAI_BASE_URL, model: e.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL });
  if (isHttps(e.META_LLAMA_BASE_URL) && e.META_LLAMA_MODEL) {
    add("meta", "META_LLAMA_API_KEY", splitKeys(e.META_LLAMA_API_KEY), { provider: "openai-compatible", baseUrl: e.META_LLAMA_BASE_URL, model: e.META_LLAMA_MODEL });
  }

  for (const x of parseExtraProviders(e.LLM_EXTRA_PROVIDERS).providers) {
    const envVar = extraKeysVar(x.id);
    add(x.id, envVar, splitKeys(extraEnv[envVar]), { provider: "openai-compatible", baseUrl: x.baseUrl, model: x.model, ...(x.jsonMode === false ? { jsonMode: false } : {}) }, { label: x.label ?? x.id, paid: x.paid });
  }
  return map;
}

/**
 * The configured provider keys, in try order, one slot per key. The explicit keys win; the
 * older LLM_PROVIDER/LLM_API_KEY pair fills its slot only when that slot has no explicit key,
 * so existing setups keep working. Every paid provider (OpenAI, Meta, extras marked paid)
 * is always after every free one.
 */
export function resolveProviders(e: LlmEnv, extraEnv: ExtraKeyEnv = process.env): ProviderDef[] {
  const map = entries(e, extraEnv);
  const extraIds = [...map.keys()].filter((id) => !(PROVIDER_IDS as readonly string[]).includes(id));
  const wanted = parseChain(e.LLM_CHAIN, extraIds);
  const listed = wanted.flatMap((id) => map.get(id) ?? []);
  // Configured providers the chain list didn't name (e.g. a legacy anthropic key, an extra) still count, ahead of the paid ones.
  const rest = [...map.values()].filter((p) => !wanted.includes(p.id));
  const ordered = [...listed, ...rest];
  const all = [...ordered.filter((p) => !p.paid), ...ordered.filter((p) => p.paid)];
  return all.flatMap((p) =>
    p.keys.map((apiKey, keyIndex) => {
      const fingerprint = keyFingerprint(apiKey);
      return { id: slotId(p.id, fingerprint, p.keys.length), provider: p.id, label: p.label, paid: p.paid, cfg: { ...p.cfg, apiKey }, fingerprint, keyIndex, keyCount: p.keys.length, envVar: p.envVar };
    }),
  );
}

export interface ProviderSetupStatus {
  id: string;
  label: string;
  paid: boolean;
  configured: boolean;
  keyCount: number;
  /** What is still missing, for the Setup page. */
  missing: string[];
}

/** Per-provider status for Setup, including why a provider isn't active. Never includes a key. */
export function describeProviders(e: LlmEnv, extraEnv: ExtraKeyEnv = process.env): ProviderSetupStatus[] {
  const map = entries(e, extraEnv);
  const row = (id: string, missing: string[], label = LABELS[id as ProviderId] ?? id, paid = PAID_PROVIDERS.includes(id)): ProviderSetupStatus => {
    const p = map.get(id);
    return { id, label: p?.label ?? label, paid: p?.paid ?? paid, configured: !!p, keyCount: p?.keys.length ?? 0, missing: p ? [] : missing };
  };
  const meta: string[] = [];
  if (!e.META_LLAMA_API_KEY) meta.push("META_LLAMA_API_KEY");
  if (!isHttps(e.META_LLAMA_BASE_URL)) meta.push("META_LLAMA_BASE_URL (https)");
  if (!e.META_LLAMA_MODEL) meta.push("META_LLAMA_MODEL");
  const extras = parseExtraProviders(e.LLM_EXTRA_PROVIDERS).providers.map((x) => row(x.id, [extraKeysVar(x.id)], x.label ?? x.id, x.paid));
  return [
    row("nvidia", ["NVIDIA_API_KEYS"]),
    row("openrouter", ["OPENROUTER_API_KEYS"]),
    row("gemini", ["GEMINI_API_KEY"]),
    row("groq", ["GROQ_API_KEY"]),
    ...(map.has("anthropic") ? [row("anthropic", [])] : []),
    ...(map.has("custom") ? [row("custom", [])] : []),
    ...extras,
    row("openai", ["OPENAI_API_KEYS"]),
    row("meta", meta),
  ];
}
