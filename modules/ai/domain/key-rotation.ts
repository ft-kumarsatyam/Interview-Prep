/**
 * Pure rules for providers that have several API keys. Each key is its own slot in the
 * chain with its own health state, and each has a lifetime token budget (some providers
 * cap a key at a fixed number of tokens, after which you create a new one). No I/O.
 */

export const DEFAULT_KEY_TOKEN_BUDGET = 100_000_000;
/** Share of the budget after which Settings warns you to create a new key. */
export const KEY_WARN_RATIO = 0.9;

/** Split a comma/whitespace separated key list, dropping blanks and duplicates. */
export function splitKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[,\s]+/).map((k) => k.trim()).filter(Boolean))];
}

/** The chain's state id for one key: the provider id alone when it has one key (keeps old state rows), else `id#fingerprint`. */
export function slotId(provider: string, fingerprint: string, keyCount: number): string {
  return keyCount > 1 ? `${provider}#${fingerprint}` : provider;
}

export function overBudget(tokensUsed: number, budget: number): boolean {
  return budget > 0 && tokensUsed >= budget;
}

export type BudgetLevel = "ok" | "warn" | "spent";

export function budgetLevel(tokensUsed: number, budget: number): BudgetLevel {
  if (budget <= 0) return "ok";
  if (tokensUsed >= budget) return "spent";
  return tokensUsed >= budget * KEY_WARN_RATIO ? "warn" : "ok";
}

/** "92M", "1.5M", "830k": short token counts for the Settings panel. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1))}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.max(0, Math.round(n)));
}

/** What Settings says about one key, or null when there is nothing to say. */
export function budgetNote(input: { label: string; keyIndex: number; keyCount: number; envVar: string; tokensUsed: number; budget: number }): string | null {
  const level = budgetLevel(input.tokensUsed, input.budget);
  if (level === "ok") return null;
  const which = input.keyCount > 1 ? `Key ${input.keyIndex + 1} of ${input.label}` : `The ${input.label} key`;
  const used = `${formatTokens(input.tokensUsed)} of ${formatTokens(input.budget)} tokens used`;
  return level === "spent"
    ? `${which}: ${used}, so it is skipped. Create a new key and add it to ${input.envVar}.`
    : `${which}: ${used}. Create a new key and add it to ${input.envVar} soon.`;
}
