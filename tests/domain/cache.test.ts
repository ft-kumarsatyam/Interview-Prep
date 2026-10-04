import { describe, expect, it } from "vitest";
import { classify, entryKey, parseEntry, stableName, versionKey } from "@/core/domain/cache";

describe("classify", () => {
  const e = { v: 1, at: 100_000 };
  it("is fresh within the ttl, stale within the stale window, then expired", () => {
    expect(classify(e, 100_000 + 59_999, 60, 120)).toBe("fresh");
    expect(classify(e, 100_000 + 60_000, 60, 120)).toBe("stale");
    expect(classify(e, 100_000 + 179_999, 60, 120)).toBe("stale");
    expect(classify(e, 100_000 + 180_000, 60, 120)).toBe("expired");
  });
  it("treats a missing entry or a future timestamp as expired", () => {
    expect(classify(null, 0, 60, 60)).toBe("expired");
    expect(classify({ v: 1, at: 200_000 }, 100_000, 60, 60)).toBe("expired");
  });
  it("without a stale window, stale never happens", () => {
    expect(classify(e, 100_000 + 61_000, 60, 0)).toBe("expired");
  });
});

describe("keys", () => {
  it("scopes by owner and embeds the version", () => {
    expect(versionKey("a", "jobs")).toBe("v:a:jobs");
    expect(entryKey("a", "jobs", "7", "q=x")).toBe("c:a:jobs:7:q=x");
    expect(entryKey("b", "jobs", "7", "q=x")).not.toBe(entryKey("a", "jobs", "7", "q=x"));
  });
  it("stableName ignores order and empty values", () => {
    expect(stableName({ b: 2, a: 1 })).toBe(stableName({ a: 1, b: 2, c: undefined, d: "", e: false, f: null }));
    expect(stableName({})).toBe("all");
    expect(stableName({ a: 1 })).not.toBe(stableName({ a: 2 }));
  });
});

describe("parseEntry", () => {
  it("returns null for junk and accepts a stored entry", () => {
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry("not json")).toBeNull();
    expect(parseEntry('{"x":1}')).toBeNull();
    expect(parseEntry('{"v":{"a":1},"at":5}')).toEqual({ v: { a: 1 }, at: 5 });
  });
});
