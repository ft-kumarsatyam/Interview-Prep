import { SpanStatusCode, trace, type Attributes, type Span } from "@opentelemetry/api";

const tracer = () => trace.getTracer("prepos");

/**
 * Runs `fn` inside a span. With no OpenTelemetry SDK registered the API hands back no-op spans, so this costs almost
 * nothing and the app behaves the same. Attributes must be counts, ids and kinds, never personal or prompt text.
 * On an error the span records only the error's type, not its message.
 */
export async function withSpan<T>(name: string, attributes: Attributes, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn(span);
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute("error.type", err instanceof Error ? err.name : "unknown");
      throw err;
    } finally {
      span.end();
    }
  });
}

/** The current trace and span ids as 32/16 hex chars, or null outside a recording span. Logs carry these. */
export function activeTraceIds(): { traceId: string; spanId: string } | null {
  const ctx = trace.getActiveSpan()?.spanContext();
  return ctx && ctx.traceId !== "00000000000000000000000000000000" ? { traceId: ctx.traceId, spanId: ctx.spanId } : null;
}

/** True when an OTLP endpoint is configured (Grafana Cloud). Without it tracing and metrics export are off. */
export function otelEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim());
}
