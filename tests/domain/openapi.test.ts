import { describe, expect, it } from "vitest";
import { buildOpenApi } from "@/core/api/openapi";
import { ALL_SPECS, SPECS } from "@/core/api/specs";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const doc = buildOpenApi(ALL_SPECS, { baseUrl: "https://prepos.example.com" }) as Json;

describe("generated OpenAPI document", () => {
  it("is OpenAPI 3.1 with info, the server and a bearer security scheme", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toMatchObject({ title: "PrepOS API", version: "1.0.0" });
    expect(doc.servers).toEqual([{ url: "https://prepos.example.com" }]);
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
  });
  it("has every route, with its method, operation id and required scopes", () => {
    for (const s of ALL_SPECS) {
      const op = doc.paths[s.path][s.method.toLowerCase()];
      expect(op.operationId).toBe(s.id);
      expect(op.security).toEqual([{ bearerAuth: [...s.scopes] }]);
    }
    expect(Object.keys(doc.paths).toSorted()).toEqual(["/api/v1/jobs", "/api/v1/postings", "/api/v1/profiles"]);
    expect(Object.keys(doc.paths["/api/v1/jobs"]).toSorted()).toEqual(["get", "post"]);
  });
  it("derives request and response schemas from the zod schemas, without a stray $schema marker", () => {
    const body = doc.paths["/api/v1/jobs"].post.requestBody.content["application/json"].schema;
    expect(body.required).toEqual(expect.arrayContaining(["title", "company", "url"]));
    expect(body.properties.title).toMatchObject({ type: "string", minLength: 2, maxLength: 200 });
    expect(JSON.stringify(doc)).not.toContain("$schema");
    expect(doc.paths["/api/v1/jobs"].post.responses["201"].content["application/json"].schema.properties.duplicate.type).toBe("boolean");
  });
  it("documents the Idempotency-Key header only on the routes that honour it", () => {
    for (const s of ALL_SPECS) {
      const params = doc.paths[s.path][s.method.toLowerCase()].parameters as Json[];
      expect(params.some((p) => p.name === "Idempotency-Key")).toBe(Boolean(s.idempotent));
    }
  });
  it("documents the standard error responses, with Retry-After on 429", () => {
    const post = doc.paths["/api/v1/jobs"].post.responses;
    for (const code of ["400", "401", "403", "409", "413", "422", "429", "500"]) expect(post[code]).toBeDefined();
    expect(post["429"].headers["Retry-After"]).toBeDefined();
    expect(doc.paths["/api/v1/jobs"].get.responses["400"]).toBeUndefined();
    expect(doc.components.schemas.Error.required).toEqual(["error"]);
  });
  it("shows the full item shape for pushed postings even though items are validated one by one", () => {
    const items = doc.paths["/api/v1/postings"].post.requestBody.content["application/json"].schema.properties.jobs.items;
    expect(items.required).toEqual(expect.arrayContaining(["title", "company", "url"]));
    expect(SPECS.pushPostings.body).toBeDefined();
  });
  it("round-trips through JSON (nothing unserialisable)", () => {
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});
