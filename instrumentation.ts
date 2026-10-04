/**
 * Runs once when a server instance starts.
 *  1. OpenTelemetry: when OTEL_EXPORTER_OTLP_ENDPOINT is set (Grafana Cloud free tier), traces for requests, Server
 *     Actions, outbound fetch, MongoDB commands, LLM calls and queue handlers are exported over OTLP, along with the
 *     AI and delivery metrics. Without it nothing is registered and tracing is a no-op.
 *  2. Pending database migrations are applied, so a deploy never serves reads that the owner-scope filter would hide
 *     (rows written before `ownerId` existed). Failure is logged, not fatal: the app still boots, and
 *     `npm run migrate` or `npm run seed` can be run by hand.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "test") return;

  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()) {
    try {
      const { registerOTel } = await import("@vercel/otel");
      const { PeriodicExportingMetricReader } = await import("@opentelemetry/sdk-metrics");
      const { OTLPMetricExporter } = await import("@opentelemetry/exporter-metrics-otlp-http");
      registerOTel({
        serviceName: process.env.OTEL_SERVICE_NAME ?? "prepos",
        // Traces use the OTLP exporter configured by the standard OTEL_EXPORTER_OTLP_* variables.
        metricReaders: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter(), exportIntervalMillis: 60_000 })],
      });
    } catch (err) {
      console.error("[otel] registration failed:", err instanceof Error ? err.message : err);
    }
  }

  if (!process.env.MONGODB_URI) return;
  try {
    const { runMigrations } = await import("@/core/db/migrations/runner");
    const r = await runMigrations();
    if (r.applied.length) console.log(`[migrate] applied ${r.applied.join(", ")}`);
  } catch (err) {
    console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  }
}
