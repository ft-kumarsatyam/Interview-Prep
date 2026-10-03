import type { ZodType } from "zod";

export const LLM_PROVIDERS = ["gemini", "anthropic", "openai-compatible"] as const;
export type LlmProviderName = (typeof LLM_PROVIDERS)[number];

export interface LlmConfig {
  provider: LlmProviderName;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** Output cap per call. Set for the paid provider so one call can't run long. */
  maxTokens?: number;
  /** Overall request deadline: aborts the call when it fires (each call still has its own 30 s timeout). */
  signal?: AbortSignal;
}

/** Port for every LLM call. Output is untrusted: implementations zod-validate before returning. */
export interface LlmProvider {
  readonly name: string;
  generateJson<T>(prompt: string, schema: ZodType<T>): Promise<T>;
  /** Which provider answered the last call (set by the chain). */
  readonly lastProvider?: string;
}

/** Raw text completion an adapter has to provide; JSON parsing and retries are shared. */
export type CompleteFn = (prompt: string) => Promise<string>;
