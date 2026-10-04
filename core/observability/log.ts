import pino, { type DestinationStream, type Logger } from "pino";
import { activeTraceIds } from "@/core/observability/trace";

/**
 * Structured JSON logs to stdout (Vercel and Docker collect it). Every line carries the active `traceId` and `spanId`,
 * so a log can be found from its trace and the other way round. Bind `runId` and `eventId` with `child()`.
 *
 * Never log resume, profile, job-description or prompt text: log counts, ids and kinds. ESLint enforces this on
 * `log.*`, `logger.*` and `console.*` calls (see eslint.config.mjs).
 */
/** Builds a logger; tests pass their own stream to read the lines back. */
export function createLogger(stream?: DestinationStream, level?: string): Logger {
  return pino(
    {
      level: level ?? process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
      base: { app: "prepos" },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      mixin: () => activeTraceIds() ?? {},
    },
    stream,
  );
}

const root: Logger = createLogger();

export const log: Logger = root;

export const logger = (bindings: { runId?: string; eventId?: string; module?: string }): Logger => root.child(bindings);
