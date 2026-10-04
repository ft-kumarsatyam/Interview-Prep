import type { ZodType } from "zod";
import { EXPLAIN_PROMPT_VERSION, explainOutputSchema, explainPrompt, type ExplainInput } from "@/modules/ai/domain/ai-explain";
import { buildRagPrompt, RAG_PROMPT_VERSION, type Passage } from "@/modules/ai/domain/rag";

/**
 * The prompt registry: every prompt this module owns, with a version. The AI cache key includes the version, so
 * changing a prompt means bumping it here (and the eval golden set in ./golden.ts says whether the change is better).
 */
export interface PromptDef<I> {
  id: string;
  /** `name@N` or `vN`; bump on any change to the prompt text or its output shape. */
  version: string;
  /** json: validated against `schema`. text: streamed plain text, checked by the grounding rules. */
  kind: "json" | "text";
  schema?: ZodType<unknown>;
  build(input: I): string;
}

export interface RagInput {
  question: string;
  passages: Passage[];
}

export const PROMPTS = {
  explain: { id: "explain", version: EXPLAIN_PROMPT_VERSION, kind: "json", schema: explainOutputSchema, build: (i: ExplainInput) => explainPrompt(i) } satisfies PromptDef<ExplainInput>,
  "rag-answer": { id: "rag-answer", version: RAG_PROMPT_VERSION, kind: "text", build: (i: RagInput) => buildRagPrompt(i.question, i.passages) } satisfies PromptDef<RagInput>,
};

export type PromptId = keyof typeof PROMPTS;
