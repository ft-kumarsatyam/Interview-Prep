import { PAID_PROVIDER, PROVIDER_IDS, type ProviderId } from "@/lib/domain/llm-router";
import type { LlmConfig } from "./types";

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
  META_LLAMA_API_KEY?: string;
  META_LLAMA_BASE_URL?: string;
  META_LLAMA_MODEL?: string;
}

export interface ProviderDef {
  id: ProviderId;
  label: string;
  /** Costs money: only used as a confirmed last resort. */
  paid: boolean;
  cfg: LlmConfig;
}

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_CHAIN: readonly ProviderId[] = ["gemini", "groq", "meta"];
/** Output cap per paid call, so one call can't run long. */
export const PAID_MAX_TOKENS = 1024;

const LABELS: Record<ProviderId, string> = { gemini: "Gemini", groq: "Groq", anthropic: "Anthropic", custom: "Custom (OpenAI-compatible)", meta: "Meta Llama (paid)" };

export function parseChain(raw: string | undefined): ProviderId[] {
  if (!raw?.trim()) return [...DEFAULT_CHAIN];
  const ids = raw
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x): x is ProviderId => (PROVIDER_IDS as readonly string[]).includes(x));
  return [...new Set(ids)];
}

const isHttps = (u: string | undefined): u is string => !!u && /^https:\/\/\S+$/.test(u);

/**
 * The providers that are actually configured, in try order. The explicit
 * GEMINI_/GROQ_/META_LLAMA_ keys win; the older LLM_PROVIDER/LLM_API_KEY pair fills
 * its slot only when that slot has no explicit key, so existing setups keep working.
 * The paid provider needs a key, an https base URL and a model, and is always last.
 */
export function resolveProviders(e: LlmEnv): ProviderDef[] {
  const defs = new Map<ProviderId, ProviderDef>();
  const add = (id: ProviderId, cfg: LlmConfig) => defs.set(id, { id, label: LABELS[id], paid: id === PAID_PROVIDER, cfg });

  if (e.GEMINI_API_KEY) add("gemini", { provider: "gemini", apiKey: e.GEMINI_API_KEY, model: e.GEMINI_MODEL });
  if (e.GROQ_API_KEY) add("groq", { provider: "openai-compatible", apiKey: e.GROQ_API_KEY, model: e.GROQ_MODEL, baseUrl: GROQ_BASE_URL });

  if (e.LLM_API_KEY) {
    const legacy = e.LLM_PROVIDER ?? "gemini";
    const cfg: LlmConfig = { provider: legacy, apiKey: e.LLM_API_KEY, model: e.LLM_MODEL, baseUrl: e.LLM_BASE_URL };
    if (legacy === "gemini" && !defs.has("gemini")) add("gemini", cfg);
    else if (legacy === "anthropic") add("anthropic", cfg);
    else if (legacy === "openai-compatible") {
      const isGroq = !e.LLM_BASE_URL || /(^|\.)groq\.com/.test(e.LLM_BASE_URL);
      const id: ProviderId = isGroq ? "groq" : "custom";
      if (!defs.has(id)) add(id, cfg);
    }
  }

  if (e.META_LLAMA_API_KEY && isHttps(e.META_LLAMA_BASE_URL) && e.META_LLAMA_MODEL) {
    add("meta", { provider: "openai-compatible", apiKey: e.META_LLAMA_API_KEY, baseUrl: e.META_LLAMA_BASE_URL, model: e.META_LLAMA_MODEL, maxTokens: PAID_MAX_TOKENS });
  }

  const wanted = parseChain(e.LLM_CHAIN);
  const listed = wanted.flatMap((id) => defs.get(id) ?? []);
  // Configured providers the chain list didn't name (e.g. a legacy anthropic key) still count, ahead of the paid one.
  const extras = [...defs.values()].filter((d) => !wanted.includes(d.id));
  const all = [...listed, ...extras];
  return [...all.filter((d) => !d.paid), ...all.filter((d) => d.paid)];
}

export interface ProviderSetupStatus {
  id: ProviderId;
  label: string;
  configured: boolean;
  /** What is still missing, for the Setup page. */
  missing: string[];
}

/** Per-provider status for Setup, including why a provider isn't active. Never includes a key. */
export function describeProviders(e: LlmEnv): ProviderSetupStatus[] {
  const active = new Set(resolveProviders(e).map((d) => d.id));
  const meta: string[] = [];
  if (!e.META_LLAMA_API_KEY) meta.push("META_LLAMA_API_KEY");
  if (!isHttps(e.META_LLAMA_BASE_URL)) meta.push("META_LLAMA_BASE_URL (https)");
  if (!e.META_LLAMA_MODEL) meta.push("META_LLAMA_MODEL");
  return [
    { id: "gemini", label: LABELS.gemini, configured: active.has("gemini"), missing: active.has("gemini") ? [] : ["GEMINI_API_KEY"] },
    { id: "groq", label: LABELS.groq, configured: active.has("groq"), missing: active.has("groq") ? [] : ["GROQ_API_KEY"] },
    { id: "meta", label: LABELS.meta, configured: active.has("meta"), missing: active.has("meta") ? [] : meta },
  ];
}
