/** Scoring for the prompt eval harness (scripts/ai-eval.ts). Pure, so the harness itself is tested without a model. */
import { checkGrounding, NOT_FOUND_ANSWER } from "@/modules/ai/domain/rag";
import { percentileMs } from "@/modules/ai/domain/ai-metrics";
import { latencyBucket, LATENCY_BUCKETS } from "@/modules/ai/domain/ai-metrics";

export interface Expectation {
  /** Each inner list is a group of alternatives; the answer must contain at least one from every group (case-insensitive). */
  mustMention?: string[][];
  mustNotMention?: string[];
  /** RAG: passage numbers that must be cited. */
  cites?: number[];
  /** RAG: the model must say the passages do not contain the answer. */
  notFound?: boolean;
}

export interface Score {
  schemaValid: boolean;
  grounded: boolean;
  problems: string[];
}

function mentions(text: string, exp: Expectation, problems: string[]): void {
  const t = text.toLowerCase();
  for (const group of exp.mustMention ?? []) if (!group.some((w) => t.includes(w.toLowerCase()))) problems.push(`missing one of: ${group.join(" | ")}`);
  for (const w of exp.mustNotMention ?? []) if (t.includes(w.toLowerCase())) problems.push(`must not contain: ${w}`);
}

/** A JSON-prompt answer: `schemaValid` comes from the zod parse the caller already did; grounding is the keyword checks. */
export function scoreJsonAnswer(schemaValid: boolean, text: string, exp: Expectation): Score {
  const problems: string[] = [];
  if (!schemaValid) problems.push("did not match the output schema");
  else mentions(text, exp, problems);
  return { schemaValid, grounded: schemaValid && problems.length === 0, problems };
}

/** A grounded-answer prompt: citations must be real, expected ones present, and the not-found reply used when due. */
export function scoreRagAnswer(text: string, passageCount: number, exp: Expectation): Score {
  const g = checkGrounding(text, passageCount);
  const problems: string[] = [];
  const schemaValid = g.text.length > 0;
  if (!schemaValid) problems.push("empty answer");
  if (exp.notFound) {
    if (!g.notFound) problems.push(`expected "${NOT_FOUND_ANSWER}"`);
  } else {
    if (g.notFound) problems.push("said not found, but the answer is in the passages");
    if (!g.grounded) problems.push(g.invalid.length ? `cites missing passages: ${g.invalid.join(",")}` : "no citation");
    for (const n of exp.cites ?? []) if (!g.cited.includes(n)) problems.push(`did not cite [${n}]`);
    mentions(g.text, exp, problems);
  }
  if (exp.notFound) mentions(g.text, { mustNotMention: exp.mustNotMention }, problems);
  return { schemaValid, grounded: schemaValid && problems.length === 0, problems };
}

export interface Outcome extends Score {
  caseId: string;
  provider: string;
  latencyMs: number;
  error?: string;
}

export interface ProviderSummary {
  provider: string;
  cases: number;
  schemaValidPct: number;
  groundedPct: number;
  p50Ms: number | null;
  p95Ms: number | null;
  errors: number;
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

export function summarize(outcomes: readonly Outcome[]): ProviderSummary[] {
  const by = new Map<string, Outcome[]>();
  for (const o of outcomes) by.set(o.provider, [...(by.get(o.provider) ?? []), o]);
  return [...by].map(([provider, list]) => {
    const buckets = new Array<number>(LATENCY_BUCKETS).fill(0);
    for (const o of list) if (!o.error) buckets[latencyBucket(o.latencyMs)]!++;
    return {
      provider,
      cases: list.length,
      schemaValidPct: pct(list.filter((o) => o.schemaValid).length, list.length),
      groundedPct: pct(list.filter((o) => o.grounded).length, list.length),
      p50Ms: percentileMs(buckets, 0.5),
      p95Ms: percentileMs(buckets, 0.95),
      errors: list.filter((o) => o.error).length,
    };
  });
}

/** CI gate: every provider must clear the schema and grounding floors. Returns the failures, empty when it passes. */
export function gate(summary: readonly ProviderSummary[], floors: { schemaValidPct: number; groundedPct: number }): string[] {
  return summary.flatMap((s) => [
    ...(s.schemaValidPct < floors.schemaValidPct ? [`${s.provider}: schema validity ${s.schemaValidPct}% < ${floors.schemaValidPct}%`] : []),
    ...(s.groundedPct < floors.groundedPct ? [`${s.provider}: grounding ${s.groundedPct}% < ${floors.groundedPct}%`] : []),
  ]);
}
