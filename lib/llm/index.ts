import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { anthropic, gemini, openaiCompatible } from "./adapters";
import type { CompleteFn, LlmConfig, LlmProvider } from "./types";

export type { LlmConfig, LlmProvider } from "./types";

/** Pull the first JSON object out of a reply that may be wrapped in prose or ``` fences. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(text.slice(start, end + 1));
}

/** Parse + validate, retrying once with the validation error appended (ARCHITECTURE §8). */
export function jsonProvider(name: string, complete: CompleteFn): LlmProvider {
  return {
    name,
    async generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T> {
      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const fullPrompt =
          attempt === 0
            ? prompt
            : `${prompt}\n\nYour previous reply was rejected: ${lastError.slice(0, 500)}\nReply again with ONLY valid JSON matching the format.`;
        try {
          const parsed = schema.safeParse(extractJson(await complete(fullPrompt)));
          if (parsed.success) return parsed.data;
          lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (lastError.startsWith("LLM HTTP")) break;
        }
      }
      throw new Error(`${name}: invalid output after retry (${lastError.slice(0, 200)})`);
    },
  };
}

export function createLlm(cfg: LlmConfig | null): LlmProvider | null {
  if (!cfg?.apiKey) return null;
  switch (cfg.provider) {
    case "anthropic":
      return jsonProvider("anthropic", anthropic(cfg));
    case "openai-compatible":
      return jsonProvider("openai-compatible", openaiCompatible(cfg));
    default:
      return jsonProvider("gemini", gemini(cfg));
  }
}

/** The configured provider, or null when no key is set (callers fall back to the bank). */
export function getLlm(): LlmProvider | null {
  const e = env();
  if (!e.LLM_API_KEY) return null;
  return createLlm({ provider: e.LLM_PROVIDER ?? "gemini", apiKey: e.LLM_API_KEY, model: e.LLM_MODEL, baseUrl: e.LLM_BASE_URL });
}
