import { SpanKind, SpanStatusCode, context, trace, type Span } from "@opentelemetry/api";
import type { mongo } from "mongoose";
type MongoClient = mongo.MongoClient;

/** Commands that are noise in a trace. */
const SKIP = new Set(["hello", "isMaster", "ismaster", "ping", "endSessions", "saslStart", "saslContinue", "buildInfo"]);

/**
 * One span per MongoDB command, from the driver's command monitoring (enable with `monitorCommands: true`). The span
 * records the command name, collection and database, never filters or documents. Parenting follows the async context
 * of the caller, which is the request or queue handler's span.
 */
export function instrumentMongoClient(client: MongoClient): void {
  const tracer = trace.getTracer("prepos.mongodb");
  const spans = new Map<number, Span>();
  client.on("commandStarted", (e) => {
    if (SKIP.has(e.commandName)) return;
    const collection = typeof (e.command as Record<string, unknown>)[e.commandName] === "string" ? ((e.command as Record<string, unknown>)[e.commandName] as string) : undefined;
    const span = tracer.startSpan(`mongodb.${e.commandName}`, { kind: SpanKind.CLIENT, attributes: { "db.system": "mongodb", "db.operation.name": e.commandName, "db.namespace": e.databaseName, ...(collection ? { "db.collection.name": collection } : {}) } }, context.active());
    spans.set(e.requestId, span);
  });
  client.on("commandSucceeded", (e) => {
    const span = spans.get(e.requestId);
    if (!span) return;
    spans.delete(e.requestId);
    span.end();
  });
  client.on("commandFailed", (e) => {
    const span = spans.get(e.requestId);
    if (!span) return;
    spans.delete(e.requestId);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.setAttribute("error.type", e.failure.name);
    span.end();
  });
}
