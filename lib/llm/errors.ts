import type { ErrorKind } from "@/lib/domain/llm-router";

/** A failed provider call, classified so the chain knows whether to cool the provider down, disable it or just try the next one. */
export class LlmHttpError extends Error {
  readonly name = "LlmHttpError";
  constructor(
    message: string,
    readonly status: number,
    readonly kind: ErrorKind,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

/** The model answered but not in the shape asked for, after the retry. Not the provider's fault. */
export class LlmInvalidOutputError extends Error {
  readonly name = "LlmInvalidOutputError";
}

/** Every provider in the chain was skipped or failed. */
export class AllProvidersFailedError extends Error {
  readonly name = "AllProvidersFailedError";
  constructor(readonly attempts: ReadonlyArray<{ provider: string; outcome: string }>) {
    super(`No AI provider could answer (${attempts.map((a) => `${a.provider}: ${a.outcome}`).join("; ") || "none configured"})`);
  }
}

/** The only provider left costs money, so the caller must ask you first. */
export class PaidConfirmRequiredError extends Error {
  readonly name = "PaidConfirmRequiredError";
  constructor(
    readonly used: number,
    readonly cap: number,
  ) {
    super("The free AI providers are unavailable. Using the paid fallback needs your confirmation.");
  }
}

/** Remove secrets from text that is about to be logged or shown. */
export function redact(text: string, secrets: readonly string[]): string {
  return secrets.filter((s) => s.length >= 6).reduce((out, s) => out.split(s).join("[redacted]"), text);
}
