/**
 * Re-exported from lib/sandbox — the Web Worker sandbox now also backs the
 * DSA runner's test-case harness (lib/sandbox/run.ts's `runWithCases`), so
 * the shared implementation lives there. This file stays so existing
 * Playground imports don't need to change.
 */
export { normalizeOutput, runCode } from "@/core/sandbox/run";
export type { LogLevel, LogLine, RunResult } from "@/core/sandbox/run";
