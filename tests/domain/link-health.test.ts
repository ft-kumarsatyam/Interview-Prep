import { describe, expect, it } from "vitest";
import { checkUrlFor, classify, nextEntry, pickBatch } from "@/modules/roadmap/domain/link-health";

describe("classify", () => {
  it("separates ok, blocked and dead", () => {
    expect(classify(200)).toBe("ok");
    expect(classify(301)).toBe("ok");
    for (const s of [401, 403, 429, 999]) expect(classify(s)).toBe("blocked");
    for (const s of [404, 410, 500, 503]) expect(classify(s)).toBe("dead");
    expect(classify(null)).toBe("dead");
  });
});

describe("nextEntry", () => {
  it("needs two failures in a row to call a link dead, and one success resets", () => {
    const first = nextEntry({ status: "ok", failures: 0 }, "dead");
    expect(first).toEqual({ status: "ok", failures: 1 });
    expect(nextEntry(first, "dead")).toEqual({ status: "dead", failures: 2 });
    expect(nextEntry({ status: "dead", failures: 2 }, "ok")).toEqual({ status: "ok", failures: 0 });
    expect(nextEntry(undefined, "dead")).toEqual({ status: "ok", failures: 1 });
  });
});

describe("pickBatch", () => {
  it("takes never-checked links first, then the stalest, without duplicates", () => {
    const known = new Map([["https://a.dev", { checkedAt: new Date("2026-01-02") }], ["https://b.dev", { checkedAt: new Date("2026-01-01") }]]);
    expect(pickBatch(["https://a.dev", "https://b.dev", "https://c.dev", "https://c.dev"], known, 3)).toEqual(["https://c.dev", "https://b.dev", "https://a.dev"]);
    expect(pickBatch(["https://a.dev", "https://b.dev", "https://c.dev"], known, 2)).toEqual(["https://c.dev", "https://b.dev"]);
    expect(pickBatch([], known, 5)).toEqual([]);
  });
});

describe("checkUrlFor", () => {
  it("tests YouTube links through oEmbed, because the watch page answers 200 for any id", () => {
    expect(checkUrlFor("https://www.youtube.com/watch?v=abc123")).toContain("youtube.com/oembed");
    expect(checkUrlFor("https://www.youtube.com/playlist?list=PL1")).toContain("oembed");
    expect(checkUrlFor("https://docs.python.org/3/")).toBe("https://docs.python.org/3/");
    expect(checkUrlFor("not a url")).toBe("not a url");
  });
});
