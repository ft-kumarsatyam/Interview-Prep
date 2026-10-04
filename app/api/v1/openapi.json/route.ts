import { buildOpenApi } from "@/core/api/openapi";
import { ALL_SPECS } from "@/core/api/specs";
import { env } from "@/core/env";

/** The OpenAPI 3.1 document for /api/v1. Public: it describes the API and contains no secrets. */
export function GET(req: Request) {
  const baseUrl = env().APP_URL ?? new URL(req.url).origin;
  return new Response(JSON.stringify(buildOpenApi(ALL_SPECS, { baseUrl })), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
}
