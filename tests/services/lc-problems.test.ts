import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LcProblemCache } from "@/core/models/lc";
import type { LcQuestion, LcQuestionFetcher } from "@/modules/dsa/lib/leetcode/question";
import { exportBackup } from "@/core/services/export";
import { LC_TTL_MS, getLeetCodeProblem } from "@/modules/dsa/services/lc-problems";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const DAY = 86_400_000;
const q = (over: Partial<LcQuestion> = {}): LcQuestion => ({
  questionId: "1",
  title: "Two Sum",
  difficulty: "Easy",
  isPaidOnly: false,
  contentHtml: "<p>Given <code>nums</code> and <code>target</code>, return indices.<script>alert(1)</script></p>",
  hints: ["<p>Use a <code>hash map</code>.</p>", "<p>Check <code>target - x</code>.</p>"],
  exampleTestcases: "[2,7,11,15]\n9",
  jsSnippet: "var twoSum = function(nums, target) {};",
  topicTags: ["Array", "Hash Table"],
  ...over,
});
const fetcherOf = (impl: () => Promise<LcQuestion | null>) => {
  const question = vi.fn(impl);
  return { fetcher: { question } satisfies LcQuestionFetcher, question };
};

describe("getLeetCodeProblem", () => {
  it("fetches once, sanitises the statement and hints, then serves from the cache", async () => {
    const { fetcher, question } = fetcherOf(async () => q());
    const first = await getLeetCodeProblem("two-sum", { fetcher, now: at("2026-10-05") });
    expect(first).toMatchObject({ status: "ok", title: "Two Sum", topicTags: ["Array", "Hash Table"], jsSnippet: "var twoSum = function(nums, target) {};" });
    expect(first.contentMd).toContain("`nums`");
    expect(first.contentMd).not.toContain("alert");
    expect(first.hints).toEqual(["Use a `hash map`.", "Check `target - x`."]);

    const second = await getLeetCodeProblem("two-sum", { fetcher, now: at("2026-10-06") });
    expect(second.status).toBe("ok");
    expect(second.contentMd).toBe(first.contentMd);
    expect(question).toHaveBeenCalledTimes(1);
  });

  it("refetches after the entry expires", async () => {
    const { fetcher, question } = fetcherOf(async () => q());
    await getLeetCodeProblem("two-sum", { fetcher, now: at("2026-10-05") });
    await getLeetCodeProblem("two-sum", { fetcher, now: new Date(at("2026-10-05").getTime() + LC_TTL_MS.ok + 1000) });
    expect(question).toHaveBeenCalledTimes(2);
  });

  it("records a premium problem without content and remembers it for 30 days", async () => {
    const { fetcher, question } = fetcherOf(async () => q({ isPaidOnly: true, contentHtml: null, hints: [] }));
    const view = await getLeetCodeProblem("two-sum", { fetcher, now: at("2026-10-05") });
    expect(view).toMatchObject({ status: "premium", title: "Two Sum", contentMd: null });
    await getLeetCodeProblem("two-sum", { fetcher, now: new Date(at("2026-10-05").getTime() + 29 * DAY) });
    expect(question).toHaveBeenCalledTimes(1);
    await getLeetCodeProblem("two-sum", { fetcher, now: new Date(at("2026-10-05").getTime() + 31 * DAY) });
    expect(question).toHaveBeenCalledTimes(2);
  });

  it("a problem LeetCode doesn't know is not_found", async () => {
    const { fetcher } = fetcherOf(async () => null);
    expect((await getLeetCodeProblem("two-sum", { fetcher })).status).toBe("not_found");
  });

  it("an outage degrades to 'error' instead of throwing, and is retried after an hour, not hammered", async () => {
    let fail = true;
    const { fetcher, question } = fetcherOf(async () => {
      if (fail) throw new Error("LeetCode responded 503");
      return q();
    });
    const t0 = at("2026-10-05");
    expect((await getLeetCodeProblem("two-sum", { fetcher, now: t0 })).status).toBe("error");
    expect((await getLeetCodeProblem("two-sum", { fetcher, now: new Date(t0.getTime() + 30 * 60_000) })).status).toBe("error");
    expect(question).toHaveBeenCalledTimes(1);

    fail = false;
    const healed = await getLeetCodeProblem("two-sum", { fetcher, now: new Date(t0.getTime() + 61 * 60_000) });
    expect(healed.status).toBe("ok");
    expect(question).toHaveBeenCalledTimes(2);
  });

  it("never asks LeetCode about a slug that isn't one of this app's problems", async () => {
    const { fetcher, question } = fetcherOf(async () => q());
    for (const slug of ["not-a-real-problem", "../etc/passwd", "two-sum/../x", ""]) {
      expect((await getLeetCodeProblem(slug, { fetcher })).status).toBe("not_found");
    }
    expect(question).not.toHaveBeenCalled();
  });

  it("caps the number and length of hints", async () => {
    const hints = Array.from({ length: 15 }, (_, i) => `<p>${"x".repeat(2000)} ${i}</p>`);
    const { fetcher } = fetcherOf(async () => q({ hints }));
    const view = await getLeetCodeProblem("two-sum", { fetcher });
    expect(view.hints).toHaveLength(10);
    expect(view.hints.every((h) => h.length <= 800)).toBe(true);
  });

  it("is never part of the backup export", async () => {
    const { fetcher } = fetcherOf(async () => q());
    await getLeetCodeProblem("two-sum", { fetcher });
    expect(await LcProblemCache.countDocuments()).toBe(1);
    const backup = await exportBackup();
    expect(Object.keys(backup.collections).some((k) => /lc|leetcode.*cache/i.test(k))).toBe(false);
    expect(JSON.stringify(backup)).not.toContain("Given");
  });
});
