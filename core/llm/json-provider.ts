import type { ZodType } from "zod";
import { anthropic, anthropicStream, gemini, geminiStream, openaiCompatible, openaiCompatibleStream } from "@/core/llm/adapters";
import { LlmHttpError, LlmInvalidOutputError } from "@/core/llm/errors";
import type { CompleteFn, LlmConfig, LlmProvider, StreamFn } from "@/core/llm/types";

/** Pull the first JSON object out of a reply that may be wrapped in prose or ``` fences. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(text.slice(start, end + 1));
}

/** Parse + validate, retrying once with the validation error appended (ARCHITECTURE §8). */
export function jsonProvider(name: string, complete: CompleteFn, stream?: StreamFn): LlmProvider {
  return {
    name,
    ...(stream ? { streamText: stream } : {}),
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
          // A failed call is the provider's problem: surface it as-is so the chain can classify it.
          if (err instanceof LlmHttpError) throw err;
          lastError = err instanceof Error ? err.message : String(err);
        }
      }
      throw new LlmInvalidOutputError(`${name}: invalid output after retry (${lastError.slice(0, 200)})`);
    },
  };
}

export function createLlm(cfg: LlmConfig | null): LlmProvider | null {
  if (!cfg?.apiKey) return null;
  switch (cfg.provider) {
    case "anthropic":
      return jsonProvider("anthropic", anthropic(cfg), anthropicStream(cfg));
    case "openai-compatible":
      return jsonProvider("openai-compatible", openaiCompatible(cfg), openaiCompatibleStream(cfg));
    default:
      return jsonProvider("gemini", gemini(cfg), geminiStream(cfg));
  }
}
