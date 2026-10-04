import { EventEmitter } from "node:events";
import { context, metrics, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { AggregationTemporality, InMemoryMetricExporter, MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Linter } from "eslint";
import type { mongo } from "mongoose";
type MongoClient = mongo.MongoClient;
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import noSensitiveLogging from "../../eslint-rules/no-sensitive-logging.mjs";
import { resetDb, startDb, stopDb } from "./db";

const spans = new InMemorySpanExporter();
const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
const reader = new PeriodicExportingMetricReader({ exporter: metricExporter, exportIntervalMillis: 3_600_000 });

beforeAll(async () => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  trace.setGlobalTracerProvider(new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(spans)] }));
  metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));
  await startDb();
});
afterAll(stopDb);
beforeEach(async () => {
  spans.reset();
  await resetDb();
});

describe("withSpan", () => {
  it("records a span with attributes and nests children under it", async () => {
    const { withSpan } = await import("@/core/observability/trace");
    await withSpan("outer", { kind: "test" }, async () => {
      await withSpan("inner", { n: 1 }, async () => undefined);
    });
    const [inner, outer] = spans.getFinishedSpans();
    expect(outer!.name).toBe("outer");
    expect(outer!.attributes).toMatchObject({ kind: "test" });
    expect(inner!.parentSpanContext?.spanId).toBe(outer!.spanContext().spanId);
  });

  it("marks an error with its type only, never its message, and rethrows", async () => {
    const { withSpan } = await import("@/core/observability/trace");
    await expect(withSpan("boom", {}, async () => { throw new TypeError("secret resume text"); })).rejects.toThrow("secret resume text");
    const [s] = spans.getFinishedSpans();
    expect(s!.status.code).toBe(2);
    expect(s!.attributes["error.type"]).toBe("TypeError");
    expect(JSON.stringify({ n: s!.name, a: s!.attributes, st: s!.status, e: s!.events })).not.toContain("secret resume text");
  });

  it("exposes the active trace ids only inside a span", async () => {
    const { activeTraceIds, withSpan } = await import("@/core/observability/trace");
    expect(activeTraceIds()).toBeNull();
    await withSpan("x", {}, async (span) => {
      expect(activeTraceIds()).toEqual({ traceId: span.spanContext().traceId, spanId: span.spanContext().spanId });
    });
  });

  it("otelEnabled follows the endpoint variable", async () => {
    const { otelEnabled } = await import("@/core/observability/trace");
    expect(otelEnabled({})).toBe(false);
    expect(otelEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: "  " })).toBe(false);
    expect(otelEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp.example" })).toBe(true);
  });
});

describe("structured logs", () => {
  it("emits JSON lines carrying the trace id, run id and event id", async () => {
    const { createLogger } = await import("@/core/observability/log");
    const { withSpan } = await import("@/core/observability/trace");
    const lines: string[] = [];
    const log = createLogger({ write: (l: string) => void lines.push(l) }, "info");
    await withSpan("req", {}, async (span) => {
      log.child({ runId: "r1", eventId: "e1" }).info({ count: 3 }, "did a thing");
      const line = JSON.parse(lines.at(-1)!);
      expect(line).toMatchObject({ app: "prepos", level: "info", msg: "did a thing", count: 3, runId: "r1", eventId: "e1", traceId: span.spanContext().traceId, spanId: span.spanContext().spanId });
      expect(typeof line.time).toBe("string");
    });
    log.info("outside");
    expect(JSON.parse(lines.at(-1)!)).not.toHaveProperty("traceId");
  });
});

describe("Mongo command spans", () => {
  it("opens a span per command, names the collection and records no filter data", async () => {
    const { instrumentMongoClient } = await import("@/core/observability/mongo");
    const client = new EventEmitter();
    instrumentMongoClient(client as unknown as MongoClient);
    client.emit("commandStarted", { requestId: 1, commandName: "find", databaseName: "prepos", command: { find: "dailyplans", filter: { secret: "do-not-trace" } } });
    client.emit("commandStarted", { requestId: 2, commandName: "ping", databaseName: "admin", command: { ping: 1 } });
    client.emit("commandSucceeded", { requestId: 1 });
    client.emit("commandSucceeded", { requestId: 2 });
    client.emit("commandStarted", { requestId: 3, commandName: "update", databaseName: "prepos", command: { update: "daylogs" } });
    client.emit("commandFailed", { requestId: 3, failure: new RangeError("x") });
    const done = spans.getFinishedSpans();
    expect(done.map((s) => s.name)).toEqual(["mongodb.find", "mongodb.update"]);
    expect(done[0]!.attributes).toMatchObject({ "db.system": "mongodb", "db.collection.name": "dailyplans", "db.namespace": "prepos" });
    expect(JSON.stringify(done.map((x) => ({ n: x.name, a: x.attributes, e: x.events })))).not.toContain("do-not-trace");
    expect(done[1]!.status.code).toBe(2);
    expect(done[1]!.attributes["error.type"]).toBe("RangeError");
  });
});

describe("OpenTelemetry metrics", () => {
  it("records AI calls, tokens, failovers, cache hits, deliveries and request time", async () => {
    const m = await import("@/core/observability/metrics");
    m.recordAiUsage({ provider: "gemini", feature: "ask", calls: 1, latencyMs: 420, firstTokenMs: 90, tokensIn: 100, tokensOut: 40, failover: true });
    m.recordAiUsage({ provider: "gemini", feature: "ask", calls: 1, fails: 1 });
    m.recordAiUsage({ provider: "cache", feature: "ask", cacheHits: 1 });
    m.recordDelivery("NotificationRequested", "done");
    m.recordCacheLookup("jobs", "hit");
    m.recordRequestDuration("dashboard", 800);
    await reader.forceFlush();
    const exported = metricExporter.getMetrics().flatMap((r) => r.scopeMetrics.flatMap((sm) => sm.metrics));
    const names = exported.map((x) => x.descriptor.name);
    for (const n of ["prepos.ai.call.duration", "prepos.ai.first_token.duration", "prepos.ai.tokens", "prepos.ai.calls", "prepos.ai.failovers", "prepos.ai.cache_hits", "prepos.outbox.delivery", "prepos.cache.lookup", "prepos.request.duration"]) expect(names).toContain(n);
    const calls = exported.find((x) => x.descriptor.name === "prepos.ai.calls")!;
    const byOutcome = Object.fromEntries(calls.dataPoints.map((d) => [String(d.attributes.outcome), d.value]));
    expect(byOutcome).toEqual({ ok: 1, failed: 1 });
  });
});

describe("latency store", () => {
  it("counts timings into a daily histogram and reads percentiles back", async () => {
    const { latencyToday, recordLatency } = await import("@/core/observability/latency");
    const now = new Date("2026-10-05T10:00:00Z");
    const opts = { timeZone: "Asia/Kolkata", now };
    expect(await latencyToday("dashboard", opts)).toEqual({ samples: 0, p50Ms: null, p95Ms: null, avgMs: null });
    for (const ms of [100, 120, 300, 300, 600, 900, 1500, 1800, 3000, 9000]) await recordLatency("dashboard", ms, opts);
    const s = await latencyToday("dashboard", opts);
    expect(s.samples).toBe(10);
    expect(s.p50Ms).toBe(1000);
    expect(s.p95Ms).toBe(16_000);
    expect(s.avgMs).toBe(1762);
    expect(await latencyToday("dashboard", { timeZone: "Asia/Kolkata", now: new Date("2026-10-06T10:00:00Z") })).toMatchObject({ samples: 0 });
    expect((await latencyToday("other", opts)).samples).toBe(0);
  });

  it("never throws, even when the write fails", async () => {
    const { recordLatency, startTimer } = await import("@/core/observability/latency");
    await expect(recordLatency("x", Number.NaN, { timeZone: "Not/AZone" })).resolves.toBeUndefined();
    expect(startTimer()()).toBeGreaterThanOrEqual(0);
  });
});

describe("health snapshot", () => {
  it("gathers dashboard latency, outbox lag, dead letters, LLM and cache state into SLO results", async () => {
    const { getHealthSnapshot } = await import("@/core/services/health");
    const { evaluateSlo } = await import("@/core/domain/slo");
    const { recordLatency } = await import("@/core/observability/latency");
    const { Outbox } = await import("@/core/models/outbox");
    const now = new Date();
    await recordLatency("dashboard", 400, { timeZone: "Asia/Kolkata", now });
    await Outbox.create({ eventId: "dead-1", type: "JobSyncRequested", ownerId: "owner", payload: {}, status: "dead" });
    const snap = await getHealthSnapshot(now);
    expect(snap).toMatchObject({ dashboardSamples: 1, deadLetters: 1, outboxLagMs: 0, kvStore: "mongo", kvFallbacks: 0 });
    expect(snap.dashboardP95Ms).toBe(500);
    const results = evaluateSlo(snap);
    expect(results.find((r) => r.id === "dead-letters")!.status).toBe("warn");
    expect(results.find((r) => r.id === "dashboard")!.status).toBe("ok");
  });
});

describe("no-sensitive-logging lint rule", () => {
  const linter = new Linter();
  const lint = (code: string) =>
    linter.verify(code, [{ plugins: { prepos: { rules: { "no-sensitive-logging": noSensitiveLogging as never } } }, rules: { "prepos/no-sensitive-logging": "error" }, languageOptions: { ecmaVersion: 2022, sourceType: "module" } }]);

  it.each([
    "console.log(resume)",
    "log.info({ prompt })",
    "logger.warn(`parsed ${resumeText}`)",
    "console.error('failed', row.jd)",
    "log.info({ data: { profile: x } })",
    "console.log('x' + prompt)",
    "log.info(JSON.stringify(resume))",
  ])("flags %s", (code) => {
    expect(lint(code).map((m) => m.ruleId)).toContain("prepos/no-sensitive-logging");
  });

  it.each([
    "console.log('resume parsed')",
    "log.info({ resumeId: id, promptTokens: 5, count: 3 })",
    "logger.info(`parsed ${count} sections`)",
    "console.log(row.text)",
    "other.log(resume)",
    "const resume = 1; save(resume)",
  ])("allows %s", (code) => {
    expect(lint(code)).toEqual([]);
  });
});
