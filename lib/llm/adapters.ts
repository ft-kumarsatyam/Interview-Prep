import { classifyHttp } from "@/lib/domain/llm-router";
import { fetchWithPolicy } from "@/lib/http";
import { LlmHttpError, redact } from "./errors";
import type { CompleteFn, LlmConfig } from "./types";

const TIMEOUT_MS = 30_000;

/**
 * Model ids get retired (gemini-2.5-flash and llama-3.3-70b-versatile already stopped working for new keys),
 * so the Gemini default is the "latest" alias. Set GEMINI_MODEL / GROQ_MODEL to pin one.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

async function postJson(url: string, body: unknown, headers: Record<string, string>, secrets: string[], signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    // No transport retries: the chain owns failover, and a repeated POST could be billed twice.
    res = await fetchWithPolicy(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      timeoutMs: TIMEOUT_MS,
      retries: 0,
      ...(signal ? { signal } : {}),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new LlmHttpError(`LLM HTTP 0: ${timedOut ? "timed out" : "network error"}`, 0, timedOut ? "timeout" : "network");
  }
  if (!res.ok) {
    const text = redact((await res.text().catch(() => "")).slice(0, 600), secrets);
    const { kind, retryAfterSec } = classifyHttp(res.status, text, res.headers.get("retry-after"));
    throw new LlmHttpError(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`, res.status, kind, retryAfterSec);
  }
  return res.json();
}

function pick(obj: unknown, path: Array<string | number>): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

function textOrThrow(value: unknown, provider: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${provider}: empty response`);
  return value;
}

/** Google AI Studio (free tier). */
export function gemini(cfg: LlmConfig): CompleteFn {
  const model = cfg.model ?? DEFAULT_GEMINI_MODEL;
  const base = cfg.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  return async (prompt) => {
    const data = await postJson(
      `${base}/models/${encodeURIComponent(model)}:generateContent`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7, ...(cfg.maxTokens ? { maxOutputTokens: cfg.maxTokens } : {}) },
      },
      { "x-goog-api-key": cfg.apiKey },
      [cfg.apiKey],
      cfg.signal,
    );
    return textOrThrow(pick(data, ["candidates", 0, "content", "parts", 0, "text"]), "gemini");
  };
}

export function anthropic(cfg: LlmConfig): CompleteFn {
  const model = cfg.model ?? "claude-haiku-4-5";
  const base = cfg.baseUrl ?? "https://api.anthropic.com/v1";
  return async (prompt) => {
    const data = await postJson(
      `${base}/messages`,
      { model, max_tokens: cfg.maxTokens ?? 4096, messages: [{ role: "user", content: prompt }] },
      { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      [cfg.apiKey],
      cfg.signal,
    );
    return textOrThrow(pick(data, ["content", 0, "text"]), "anthropic");
  };
}

/** Any /chat/completions API: Groq (default), OpenRouter, Together, a Meta Llama endpoint, local Ollama... */
export function openaiCompatible(cfg: LlmConfig): CompleteFn {
  const model = cfg.model ?? DEFAULT_GROQ_MODEL;
  const base = (cfg.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
  return async (prompt) => {
    const data = await postJson(
      `${base}/chat/completions`,
      {
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        ...(cfg.maxTokens ? { max_tokens: cfg.maxTokens } : {}),
        messages: [{ role: "user", content: prompt }],
      },
      { authorization: `Bearer ${cfg.apiKey}` },
      [cfg.apiKey],
      cfg.signal,
    );
    return textOrThrow(pick(data, ["choices", 0, "message", "content"]), "openai-compatible");
  };
}
