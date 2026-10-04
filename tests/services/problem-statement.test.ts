import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CopyAndOpen } from "@/modules/dsa/components/copy-and-open";
import { ProblemStatement, ProblemStatementSkeleton } from "@/modules/dsa/components/problem-statement-section";
import { LcProblemCache } from "@/core/models/lc";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const render = async (slug = "two-sum") => renderToStaticMarkup(await ProblemStatement({ slug, url: `https://leetcode.com/problems/${slug}/` }));
const seed = (over: Record<string, unknown>) =>
  LcProblemCache.create({ _id: "two-sum", status: "ok", fetchedAt: new Date(), expiresAt: new Date(Date.now() + 1e9), ...over });

describe("ProblemStatement", () => {
  it("shows the statement, topics and LeetCode's hints", async () => {
    await seed({ title: "Two Sum", contentMd: "Given an array `nums`, return **indices**.", hints: ["Use a hash map.", "Check `target - x`."], topicTags: ["Array", "Hash Table"] });
    const html = await render();
    expect(html).toContain("Given an array");
    expect(html).toContain("<strong>indices</strong>");
    expect(html).toContain("Hash Table");
    expect(html).toContain("LeetCode&#x27;s hints (2)");
    expect(html).toContain("Hint 2");
    expect(html).toContain("isn&#x27;t stored in the project files");
  });

  it("renders stored text as text, never as markup", async () => {
    await seed({ contentMd: "<script>alert(1)</script> and [x](javascript:alert(2)) and <img src=x onerror=alert(3)>", hints: [] });
    const html = await render();
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onerror");
  });

  it("explains a premium problem and links out", async () => {
    await seed({ status: "premium", contentMd: null });
    const html = await render();
    expect(html).toContain("LeetCode Premium");
    expect(html).toContain('href="https://leetcode.com/problems/two-sum/"');
  });

  it("explains an outage without breaking the page", async () => {
    await seed({ status: "error", contentMd: null });
    expect(await render()).toContain("try again within the hour");
  });

  it("says so for a problem LeetCode doesn't have", async () => {
    await seed({ status: "not_found", contentMd: null });
    expect(await render()).toContain("no problem with this name");
  });

  it("has a loading skeleton for the Suspense fallback", () => {
    expect(renderToStaticMarkup(createElement(ProblemStatementSkeleton))).toContain("Loading the problem statement");
  });
});

describe("CopyAndOpen", () => {
  it("offers one clear button and no watcher until clicked", () => {
    const html = renderToStaticMarkup(createElement(CopyAndOpen, { slug: "two-sum", url: "https://leetcode.com/problems/two-sum/", getCode: () => "x", onAccepted: () => {} }));
    expect(html).toContain("Copy code + open LeetCode");
    expect(html).not.toContain("Watching for your Accepted submission");
    expect(html).toContain('type="button"');
  });
});
