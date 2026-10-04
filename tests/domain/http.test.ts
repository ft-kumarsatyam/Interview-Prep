import { describe, expect, it } from "vitest";
import { pLimit } from "@/core/http";

describe("pLimit", () => {
  it("never runs more than n tasks at once and returns each result", async () => {
    const limit = pLimit(2);
    let active = 0;
    let peak = 0;
    const task = (n: number) => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    };
    const out = await Promise.all([1, 2, 3, 4, 5].map((n) => limit(task(n))));
    expect(out).toEqual([1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("keeps going after a rejected task", async () => {
    const limit = pLimit(1);
    const results = await Promise.allSettled([limit(async () => Promise.reject(new Error("x"))), limit(async () => 7)]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "fulfilled"]);
  });
});
