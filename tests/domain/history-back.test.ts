import { describe, expect, it } from "vitest";
import { patchQuery, stepsBackTo } from "@/core/domain/history-back";

const origin = "https://prep.example";

describe("stepsBackTo", () => {
  it("finds the list you came from, past sibling pages", () => {
    const entries = ["/dashboard", "/dsa?tab=sheets&section=Graphs", "/dsa/two-sum", "/dsa/contains-duplicate"].map((p) => origin + p);
    expect(stepsBackTo(entries, 3, "/dsa?pattern=Arrays", origin)).toBe(2);
  });

  it("returns null when the page is not behind you", () => {
    expect(stepsBackTo([`${origin}/dashboard`, `${origin}/dsa/two-sum`], 1, "/dsa", origin)).toBeNull();
    expect(stepsBackTo([`${origin}/dsa`, `${origin}/dsa/two-sum`], 0, "/dsa", origin)).toBeNull();
    expect(stepsBackTo([`${origin}/dsa`, `${origin}/dsa/two-sum`], 1, "https://other.example/dsa", origin)).toBeNull();
  });
});

describe("patchQuery", () => {
  it("sets, repeats and removes keys while keeping the rest", () => {
    expect(patchQuery("pattern=Trees&tab=practice", { tab: "sheets", open: ["a", "b"] })).toBe("pattern=Trees&tab=sheets&open=a&open=b");
    expect(patchQuery("pattern=Trees&tab=sheets", { tab: null, pattern: "" })).toBe("");
  });
});
