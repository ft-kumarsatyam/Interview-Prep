import { z, type ZodType } from "zod";
import type { RouteSpec } from "@/core/api/v1";
import { API_SCOPES, SCOPE_LABEL } from "@/core/domain/api-token";
import { DEFAULT_RATE } from "@/core/api/v1";

type Json = Record<string, unknown>;

/** Zod -> JSON Schema 2020-12, which is what OpenAPI 3.1 uses. The standalone `$schema` marker is dropped. */
function schemaOf(schema: ZodType): Json {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { unrepresentable: "any" }) as Json;
  void _drop;
  return rest;
}

const errorSchema: Json = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: { code: { type: "string", description: "A stable machine-readable code" }, message: { type: "string" }, details: { description: "Present on validation errors: the failing fields" } },
    },
  },
};

const errorRef = (description: string): Json => ({ description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } });

/** OpenAPI 3.1 for the v1 API, generated from the same specs the routes use, so the document cannot drift from the code. */
export function buildOpenApi(specs: readonly RouteSpec[], opts: { baseUrl: string; version?: string }): Json {
  const paths: Record<string, Record<string, Json>> = {};
  for (const s of specs) {
    const op: Json = {
      operationId: s.id,
      summary: s.summary,
      ...(s.description ? { description: s.description } : {}),
      tags: [s.path.split("/")[3] ?? "api"],
      security: [{ bearerAuth: [...s.scopes] }],
      parameters: s.idempotent ? [{ name: "Idempotency-Key", in: "header", required: false, description: "8-128 characters. Repeating a request with the same key within 24 hours returns the first response (with `Idempotent-Replayed: true`) instead of doing it twice. Reusing a key with a different body is a 422.", schema: { type: "string", minLength: 8, maxLength: 128, pattern: "^[A-Za-z0-9._:-]+$" } }] : [],
      ...(s.method === "POST" && (s.docBody ?? s.body) ? { requestBody: { required: true, content: { "application/json": { schema: schemaOf((s.docBody ?? s.body)!) } } } } : {}),
      responses: {
        [String(s.successStatus ?? 200)]: { description: "Success", headers: { "X-RateLimit-Remaining": { description: "Requests left in the current window", schema: { type: "integer" } } }, content: { "application/json": { schema: schemaOf(s.response) } } },
        ...(s.method === "POST" ? { "400": errorRef("The body is not JSON, or the Idempotency-Key is malformed"), "413": errorRef("The body is larger than 1.5 MB"), "422": errorRef("The body failed validation, or the Idempotency-Key was reused with a different request") } : {}),
        "401": errorRef("The token is missing, malformed, expired or revoked"),
        "403": errorRef("The token lacks a required scope"),
        ...(s.idempotent ? { "409": errorRef("A request with this Idempotency-Key is still running; retry shortly") } : {}),
        "429": { ...errorRef(`More than ${(s.rate ?? DEFAULT_RATE).max} requests in ${(s.rate ?? DEFAULT_RATE).windowSec} seconds for this token`), headers: { "Retry-After": { description: "Seconds to wait", schema: { type: "integer" } } } },
        "500": errorRef("Something went wrong on the server. Safe to retry"),
      },
    };
    (paths[s.path] ??= {})[s.method.toLowerCase()] = op;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "PrepOS API",
      version: opts.version ?? "1.0.0",
      description: "A small public API for your own PrepOS: capture jobs and profiles from the Chrome extension, push postings from automations, read your tracker. Authenticate with a scoped API token created in Settings.",
    },
    servers: [{ url: opts.baseUrl }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "pk_<prefix>_<secret>", description: `Scopes: ${API_SCOPES.map((s) => `${s} (${SCOPE_LABEL[s]})`).join("; ")}.` } },
      schemas: { Error: errorSchema },
    },
  };
}
