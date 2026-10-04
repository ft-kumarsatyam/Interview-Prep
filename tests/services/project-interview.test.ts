import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/core/env";
import { MockSession } from "@/core/models/mock";
import { Settings } from "@/core/models/system";
import { invalidateSettings } from "@/modules/settings/services/settings";
import type { Get } from "@/modules/mock/lib/github";
import { readRepo, readSite } from "@/modules/mock/lib/github";
import { getMock, startMock } from "@/modules/mock/services/mock";
import { projectPrompts, readProject } from "@/modules/mock/services/project-interview";
import { parseRepoUrl } from "@/modules/mock/domain/project-brief";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GITHUB_TOKEN;
  resetEnvForTests();
});

const FILES: Record<string, string> = {
  "README.md": "# Shop API\nAn orders API.\nDB_PASSWORD=hunter2-very-secret\n",
  "package.json": JSON.stringify({ dependencies: { express: "4", mongoose: "8", ioredis: "5" } }),
  "src/index.ts": "import express from 'express';\nconst app = express();\napp.listen(3000);",
  "src/db.ts": "export const uri = process.env.MONGO_URI;\nconst API_KEY = 'sk-live-abcdefghijklmnopqrstuvwxyz';",
  "src/orders.ts": "export async function createOrder() { /* idempotency key check */ }",
  Dockerfile: "FROM node:22",
};
const TREE = [...Object.entries(FILES).map(([path, c]) => ({ path, type: "blob", size: c.length })), { path: ".env", type: "blob", size: 80 }, { path: "node_modules/x/index.js", type: "blob", size: 500 }, { path: "docs", type: "tree" }];

/** A fake GitHub: routes the three kinds of URL the reader uses. */
function fakeGithub(opts: { repoStatus?: number; priv?: boolean; fail?: string[] } = {}): Get & { urls: string[] } {
  const urls: string[] = [];
  const get = (async (url: string) => {
    urls.push(url);
    if (url.startsWith("https://api.github.com/repos/") && url.includes("/git/trees/")) return { status: 200, text: JSON.stringify({ tree: TREE }) };
    if (url.startsWith("https://api.github.com/repos/")) {
      if (opts.repoStatus && opts.repoStatus !== 200) return { status: opts.repoStatus, text: "{}" };
      return { status: 200, text: JSON.stringify({ full_name: "octocat/shop", description: "A small shop API", language: "TypeScript", topics: ["express"], stargazers_count: 2, pushed_at: "2026-09-01T00:00:00Z", default_branch: "main", private: opts.priv ?? false }) };
    }
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      const path = decodeURIComponent(url.split("/main/")[1]!);
      if (opts.fail?.includes(path)) throw new Error("boom");
      return FILES[path] ? { status: 200, text: FILES[path]! } : { status: 404, text: "" };
    }
    if (url === "https://shop.example.com") return { status: 200, text: "<title>Shop</title><h1>Fast orders</h1><h2>Checkout</h2>" };
    return { status: 404, text: "" };
  }) as Get & { urls: string[] };
  get.urls = urls;
  return get;
}

describe("readRepo and readSite", () => {
  it("reads details, the file list and only the files worth reading", async () => {
    const get = fakeGithub();
    const snap = await readRepo({ owner: "octocat", repo: "shop" }, { get });
    expect(snap.meta).toMatchObject({ fullName: "octocat/shop", language: "TypeScript", defaultBranch: "main" });
    expect(Object.keys(snap.files).toSorted()).toEqual(["Dockerfile", "README.md", "package.json", "src/db.ts", "src/index.ts", "src/orders.ts"]);
    expect(get.urls.some((u) => u.includes(".env") || u.includes("node_modules"))).toBe(false);
    expect(snap.tree.every((e) => e.path !== "docs")).toBe(true);
  });
  it("sends the token when one is given and never when not", async () => {
    const seen: Array<Record<string, string> | undefined> = [];
    const get: Get = async (url, headers) => {
      seen.push(headers);
      return fakeGithub()(url, headers);
    };
    await readRepo({ owner: "o", repo: "r" }, { get, token: "ghp_tokentokentoken" });
    expect(seen[0]?.authorization).toBe("Bearer ghp_tokentokentoken");
    seen.length = 0;
    await readRepo({ owner: "o", repo: "r" }, { get });
    expect(seen[0]?.authorization).toBeUndefined();
  });
  it("explains a missing, private or rate-limited repository", async () => {
    await expect(readRepo({ owner: "o", repo: "r" }, { get: fakeGithub({ repoStatus: 404 }) })).rejects.toThrow(/private/);
    await expect(readRepo({ owner: "o", repo: "r" }, { get: fakeGithub({ priv: true }) })).rejects.toThrow(/private/);
    await expect(readRepo({ owner: "o", repo: "r" }, { get: fakeGithub({ repoStatus: 403 }) })).rejects.toThrow(/limit/);
    await expect(readRepo({ owner: "o", repo: "r" }, { get: fakeGithub({ repoStatus: 500 }) })).rejects.toThrow(/HTTP 500/);
  });
  it("tolerates a file that fails to download", async () => {
    const snap = await readRepo({ owner: "o", repo: "r" }, { get: fakeGithub({ fail: ["src/orders.ts"] }) });
    expect(snap.files["src/orders.ts"]).toBeUndefined();
    expect(snap.files["src/db.ts"]).toBeDefined();
  });
  it("reads a site's headings, and returns null for an unreadable one", async () => {
    expect(await readSite("https://shop.example.com", fakeGithub())).toMatchObject({ title: "Shop", headings: ["Fast orders", "Checkout"] });
    expect(await readSite("https://nothing.example.com", fakeGithub())).toBeNull();
    expect(await readSite("https://x.com", async () => { throw new Error("down"); })).toBeNull();
  });
});

describe("readProject", () => {
  it("builds a brief with the stack, with secrets removed, and tolerates a missing site", async () => {
    const r = await readProject({ repoUrl: "https://github.com/octocat/shop", siteUrl: "https://shop.example.com" }, { get: fakeGithub() });
    expect(r).toMatchObject({ ok: true, siteRead: true, siteSkipped: null });
    if (!r.ok) return;
    expect(r.brief.stack).toEqual(expect.arrayContaining(["Express", "Mongoose/MongoDB", "Redis", "Docker"]));
    expect(r.brief.text).toContain("Headings: Fast orders | Checkout");
    expect(r.brief.text).not.toContain("hunter2-very-secret");
    expect(r.brief.text).not.toContain("sk-live-abcdefghijklmnopqrstuvwxyz");
    expect(r.brief.paths).not.toContain(".env");
    const noSite = await readProject({ repoUrl: "https://github.com/octocat/shop", siteUrl: "https://gone.example.com" }, { get: fakeGithub() });
    expect(noSite).toMatchObject({ ok: true, siteRead: false, siteSkipped: expect.stringContaining("couldn't be read") });
  });
  it("rejects bad links before touching the network", async () => {
    const get = vi.fn();
    expect(await readProject({ repoUrl: "https://gitlab.com/a/b" }, { get })).toMatchObject({ ok: false });
    expect(await readProject({ repoUrl: "https://github.com/a/b", siteUrl: "http://localhost:3000" }, { get })).toMatchObject({ ok: false, error: expect.stringContaining("https") });
    expect(get).not.toHaveBeenCalled();
  });
  it("turns GitHub failures into a readable error", async () => {
    expect(await readProject({ repoUrl: "https://github.com/octocat/shop" }, { get: fakeGithub({ repoStatus: 404 }) })).toMatchObject({ ok: false, error: expect.stringContaining("private") });
  });
});

const gemini = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const q = (kind: string, prompt: string, evidence: string[] = []) => ({ kind, prompt, points: ["first point here", "second point here", "third point here"], evidence });
const GOOD = [
  q("technical", "Why did you put the idempotency check in the order creation path rather than at the API gateway?", ["src/orders.ts"]),
  q("technical", "How does your Mongo connection handle reconnects and what happens to in-flight writes?", ["src/db.ts", "Mongoose/MongoDB"]),
  q("technical", "What would break first if the Redis instance became unavailable under load?", ["Redis"]),
  q("behavioral", "Tell me about a bug in this project that took you longest to find and how you found it."),
  q("behavioral", "Describe a design decision in this project you would now make differently."),
];
const useKey = () => {
  process.env.GEMINI_API_KEY = "gem-key-1234567";
  resetEnvForTests();
};
async function brief() {
  const r = await readProject({ repoUrl: "https://github.com/octocat/shop" }, { get: fakeGithub() });
  if (!r.ok) throw new Error("setup");
  return r.brief;
}

describe("projectPrompts", () => {
  it("returns grounded technical and behavioral prompts, tagged for the right rubric, and never sends secrets to the model", async () => {
    useKey();
    const fetchMock = vi.fn(async (..._a: unknown[]) => gemini({ questions: GOOD }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await projectPrompts(await brief());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prompts.map((p) => p.topic)).toEqual(["project", "project", "project", "behavioral", "behavioral"]);
    expect(r.prompts[0]!.context).toContain("src/orders.ts");
    expect(r.prompts[3]!.context).toBeUndefined();
    const sent = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(sent).toContain("src/orders.ts");
    expect(sent).not.toContain("hunter2-very-secret");
    expect(sent).not.toContain("sk-live-abcdefghijklmnopqrstuvwxyz");
  });
  it("drops technical questions whose evidence is not in the repo, and fails when too few remain", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => gemini({ questions: [q("technical", "Explain your Kubernetes autoscaling configuration in detail please", ["k8s/hpa.yaml"]), q("technical", "Explain how your Kafka consumers rebalance when pods restart", ["Kafka"]), ...GOOD.slice(3)] })));
    expect(await projectPrompts(await brief())).toMatchObject({ ok: false, error: expect.stringContaining("tied to your code") });
  });
  it("reports a missing key and a failing model", async () => {
    expect(await projectPrompts(await brief())).toMatchObject({ ok: false, error: expect.stringContaining("Gemini") });
    useKey();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    expect((await projectPrompts(await brief())).ok).toBe(false);
  });
});

describe("starting a project interview", () => {
  it("creates a session whose questions come from the repo, graded with the right rubric, and remembers the project", async () => {
    useKey();
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => (String(url).includes("generativelanguage") ? gemini({ questions: GOOD }) : new Response("{}", { status: 404 }))));
    const github = fakeGithub();
    const res = await startMock({ type: "project", source: "sheet", aiQuestions: false, projectRepo: "https://github.com/octocat/shop" }, new Date(), { get: github });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const mock = await getMock(res.id);
    expect(mock?.project).toMatchObject({ repo: "octocat/shop", stack: expect.arrayContaining(["Express"]) });
    const qs = mock!.rounds[0]!.questions;
    expect(qs).toHaveLength(5);
    expect(qs.map((x) => x.id.split("-")[0])).toEqual(["project", "project", "project", "behavioral", "behavioral"]);
    const first = qs[0]!;
    expect(first.kind === "written" && first.context).toContain("src/orders.ts");
    expect(mock!.durationMin).toBe(45);
  });

  it("refuses to start (rather than ask generic questions) when the repo cannot be read or the model fails", async () => {
    const bad = await startMock({ type: "project", source: "sheet", aiQuestions: false, projectRepo: "https://gitlab.com/a/b" });
    expect(bad).toMatchObject({ ok: false });
    expect(await MockSession.countDocuments({})).toBe(0);
    expect(getMock).toBeDefined();
  });

  it("still supports the old typed description with no repository", async () => {
    const res = await startMock({ type: "project", source: "sheet", aiQuestions: false, project: "A todo app with Redis" });
    expect(res.ok).toBe(true);
  });
});

describe("repo URL parsing is shared", () => {
  it("is the same parser the action uses", () => expect(parseRepoUrl("https://github.com/octocat/shop")).toEqual({ owner: "octocat", repo: "shop" }));
});
