import type { ZodType } from "zod";

export const LLM_PROVIDERS = ["gemini", "anthropic", "openai-compatible"] as const;
export type LlmProviderName = (typeof LLM_PROVIDERS)[number];

export interface LlmConfig {
  provider: LlmProviderName;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/** Port for every LLM call. Output is untrusted: implementations zod-validate before returning. */
export interface LlmProvider {
  readonly name: string;
  generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T>;
}

/** Raw text completion an adapter has to provide; JSON parsing and retries are shared. */
export type CompleteFn = (prompt: string) => Promise<string>;
