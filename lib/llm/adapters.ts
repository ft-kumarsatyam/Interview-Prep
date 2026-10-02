import type { CompleteFn, LlmConfig } from "./types";

const TIMEOUT_MS = 30_000;

async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`LLM HTTP ${res.status}: ${text}`);
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
  const model = cfg.model ?? "gemini-2.5-flash";
  const base = cfg.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  return async (prompt) => {
    const data = await postJson(
      `${base}/models/${encodeURIComponent(model)}:generateContent`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      },
      { "x-goog-api-key": cfg.apiKey },
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
      { model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] },
      { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    );
    return textOrThrow(pick(data, ["content", 0, "text"]), "anthropic");
  };
}

/** Any /chat/completions API: Groq (default), OpenRouter, Together, local Ollama… */
export function openaiCompatible(cfg: LlmConfig): CompleteFn {
  const model = cfg.model ?? "llama-3.3-70b-versatile";
  const base = (cfg.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
  return async (prompt) => {
    const data = await postJson(
      `${base}/chat/completions`,
      { model, temperature: 0.7, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] },
      { authorization: `Bearer ${cfg.apiKey}` },
    );
    return textOrThrow(pick(data, ["choices", 0, "message", "content"]), "openai-compatible");
  };
}
