import { classifyHttp } from "@/modules/ai/domain/llm-router";
import { fetchWithPolicy } from "@/core/http";
import { LlmHttpError, redact } from "@/core/llm/errors";
import { sseData } from "@/core/llm/sse";
import type { CompleteFn, LlmConfig, StreamFn } from "@/core/llm/types";

const TIMEOUT_MS = 30_000;

/**
 * Model ids get retired (gemini-2.5-flash and llama-3.3-70b-versatile already stopped working for new keys),
 * so the Gemini default is the "latest" alias. Set GEMINI_MODEL / GROQ_MODEL to pin one.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

async function postRaw(url: string, body: unknown, headers: Record<string, string>, secrets: string[], signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<Response> {
  let res: Response;
  try {
    // No transport retries: the chain owns failover, and a repeated POST could be billed twice.
    res = await fetchWithPolicy(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      timeoutMs,
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
  return res;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, secrets: string[], signal?: AbortSignal): Promise<unknown> {
  return (await postRaw(url, body, headers, secrets, signal)).json();
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
        ...(cfg.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
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

/* ------------------------------- streaming (plain text, no JSON mode) ------------------------------- */

const STREAM_TIMEOUT_MS = 60_000;

async function* textEvents(res: Response, extract: (event: unknown) => string | undefined): AsyncGenerator<string> {
  if (!res.body) throw new Error("LLM stream had no body");
  for await (const data of sseData(res.body)) {
    if (data === "[DONE]") return;
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      continue; // keep-alives and comments
    }
    const text = extract(json);
    if (text) yield text;
  }
}

export function geminiStream(cfg: LlmConfig): StreamFn {
  const model = cfg.model ?? DEFAULT_GEMINI_MODEL;
  const base = cfg.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  return async function* (prompt) {
    const res = await postRaw(
      `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, ...(cfg.maxTokens ? { maxOutputTokens: cfg.maxTokens } : {}) } },
      { "x-goog-api-key": cfg.apiKey },
      [cfg.apiKey],
      cfg.signal,
      STREAM_TIMEOUT_MS,
    );
    yield* textEvents(res, (e) => {
      const parts = pick(e, ["candidates", 0, "content", "parts"]);
      return Array.isArray(parts) ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("") : undefined;
    });
  };
}

export function openaiCompatibleStream(cfg: LlmConfig): StreamFn {
  const model = cfg.model ?? DEFAULT_GROQ_MODEL;
  const base = (cfg.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
  return async function* (prompt) {
    const res = await postRaw(
      `${base}/chat/completions`,
      { model, temperature: 0.3, stream: true, ...(cfg.maxTokens ? { max_tokens: cfg.maxTokens } : {}), messages: [{ role: "user", content: prompt }] },
      { authorization: `Bearer ${cfg.apiKey}` },
      [cfg.apiKey],
      cfg.signal,
      STREAM_TIMEOUT_MS,
    );
    yield* textEvents(res, (e) => {
      const t = pick(e, ["choices", 0, "delta", "content"]);
      return typeof t === "string" ? t : undefined;
    });
  };
}

export function anthropicStream(cfg: LlmConfig): StreamFn {
  const model = cfg.model ?? "claude-haiku-4-5";
  const base = cfg.baseUrl ?? "https://api.anthropic.com/v1";
  return async function* (prompt) {
    const res = await postRaw(
      `${base}/messages`,
      { model, max_tokens: cfg.maxTokens ?? 1024, stream: true, messages: [{ role: "user", content: prompt }] },
      { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      [cfg.apiKey],
      cfg.signal,
      STREAM_TIMEOUT_MS,
    );
    yield* textEvents(res, (e) => (pick(e, ["type"]) === "content_block_delta" && typeof pick(e, ["delta", "text"]) === "string" ? (pick(e, ["delta", "text"]) as string) : undefined));
  };
}
