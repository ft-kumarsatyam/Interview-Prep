import { describe, expect, it } from "vitest";
import { withOwner, ownerPipeline, ownerUniqueIndex } from "@/core/domain/owner-scope";

describe("withOwner", () => {
  it("adds the owner to an empty or missing filter", () => {
    expect(withOwner(undefined, "a")).toEqual({ ownerId: "a" });
    expect(withOwner({}, "a")).toEqual({ ownerId: "a" });
  });
  it("keeps the other fields", () => {
    expect(withOwner({ date: "2026-01-01" }, "a")).toEqual({ date: "2026-01-01", ownerId: "a" });
  });
  it("respects an explicit ownerId, so cross-owner jobs can opt out", () => {
    expect(withOwner({ ownerId: "b" }, "a")).toEqual({ ownerId: "b" });
  });
  it("does not mutate the input", () => {
    const f = { x: 1 };
    withOwner(f, "a");
    expect(f).toEqual({ x: 1 });
  });
});

describe("ownerPipeline", () => {
  it("prepends an owner $match", () => {
    expect(ownerPipeline([{ $group: { _id: "$k" } }], "a")).toEqual([{ $match: { ownerId: "a" } }, { $group: { _id: "$k" } }]);
  });
  it("keeps $vectorSearch and $search first", () => {
    expect(ownerPipeline([{ $vectorSearch: {} }, { $limit: 3 }], "a")[1]).toEqual({ $match: { ownerId: "a" } });
    expect(ownerPipeline([{ $search: {} }], "a")[0]).toEqual({ $search: {} });
  });
  it("is idempotent and keeps an explicit ownerId match", () => {
    const once = ownerPipeline([{ $count: "n" }], "a");
    expect(ownerPipeline(once, "a")).toEqual(once);
    expect(ownerPipeline([{ $match: { ownerId: "b" } }], "a")).toEqual([{ $match: { ownerId: "b" } }]);
  });
  it("handles an empty pipeline and does not mutate", () => {
    const p: Array<Record<string, unknown>> = [];
    expect(ownerPipeline(p, "a")).toEqual([{ $match: { ownerId: "a" } }]);
    expect(p).toEqual([]);
  });
});

describe("ownerUniqueIndex", () => {
  it("puts ownerId first", () => {
    expect(Object.keys(ownerUniqueIndex({ date: 1, kind: 1 }))).toEqual(["ownerId", "date", "kind"]);
  });
});
