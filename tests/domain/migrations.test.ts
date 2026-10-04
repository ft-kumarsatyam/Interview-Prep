import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "@/core/db/migrations";
import { pendingMigrations, validateMigrationIds } from "@/core/domain/migrations";

describe("registered migrations", () => {
  it("have well-formed, unique, ordered ids", () => {
    expect(validateMigrationIds(MIGRATIONS.map((m) => m.id))).toEqual([]);
  });
});

describe("validateMigrationIds", () => {
  it("flags bad names, duplicates and wrong order", () => {
    expect(validateMigrationIds(["1-x"])).toHaveLength(1);
    expect(validateMigrationIds(["001-a", "001-a"]).some((p) => p.includes("duplicate"))).toBe(true);
    expect(validateMigrationIds(["002-b", "001-a"]).some((p) => p.includes("order"))).toBe(true);
  });
});

describe("pendingMigrations", () => {
  const all = [{ id: "001-a" }, { id: "002-b" }, { id: "003-c" }];
  it("returns the ones not applied, in order", () => {
    expect(pendingMigrations(all, ["001-a"]).map((m) => m.id)).toEqual(["002-b", "003-c"]);
    expect(pendingMigrations(all, [])).toHaveLength(3);
    expect(pendingMigrations(all, ["001-a", "002-b", "003-c"])).toEqual([]);
  });
  it("refuses when history was deleted from the code", () => {
    expect(() => pendingMigrations(all, ["000-gone"])).toThrow(/missing from the code/);
  });
});
