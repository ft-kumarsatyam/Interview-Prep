import { describe, expect, it } from "vitest";
import { buildChecklist, buildUnreachableChecklist, type SetupInput } from "@/lib/domain/setup";

const now = new Date("2026-10-02T14:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const healthy: SetupInput = {
  now,
  content: { problems: 669, expectedProblems: 669, topics: 70, expectedTopics: 70 },
  secrets: { authSecretLength: 44, cronSecretLength: 64 },
  leetcode: { username: "imksatyam", lastSyncAt: hoursAgo(1), lastError: null, profileFound: true, solved: 11 },
  jobs: { lastMorningAt: hoursAgo(8), lastEveningAt: hoursAgo(18) },
  news: { lastFetchAt: hoursAgo(8), failed: 2, feeds: 51 },
  notify: { telegram: true, email: false, whatsapp: false },
  llm: { configured: false, provider: null },
  backup: { lastExportAt: hoursAgo(48) },
  session: { remember: true },
};

const item = (input: SetupInput, id: string) => buildChecklist(input).items.find((i) => i.id === id)!;

describe("buildChecklist", () => {
  it("is complete for a healthy deployment; optional gaps don't block", () => {
    const c = buildChecklist(healthy);
    expect(c.requiredLeft).toBe(0);
    expect(c.total).toBe(9);
    expect(item(healthy, "llm")).toMatchObject({ status: "warn", required: false });
    expect(item(healthy, "leetcode").detail).toContain("@imksatyam · 11 solved");
  });

  it("flags missing content and weak secrets", () => {
    const input = { ...healthy, content: { ...healthy.content, problems: 0, topics: 0 }, secrets: { authSecretLength: 10, cronSecretLength: 0 } };
    expect(item(input, "database")).toMatchObject({ status: "todo", actions: [{ id: "seed" }] });
    expect(item(input, "secrets").status).toBe("todo");
    expect(item(input, "secrets").detail).toContain("CRON_SECRET is not set");
    expect(buildChecklist(input).requiredLeft).toBe(2);
  });

  it("explains LeetCode problems: no username, unknown profile, failing sync", () => {
    const lc = (patch: Partial<SetupInput["leetcode"]>) => item({ ...healthy, leetcode: { ...healthy.leetcode, ...patch } }, "leetcode");
    expect(lc({ username: null }).status).toBe("todo");
    expect(lc({ profileFound: false }).detail).toContain('No public LeetCode profile called "imksatyam"');
    expect(lc({ lastError: "LeetCode responded 503" })).toMatchObject({ status: "warn" });
    expect(lc({ lastSyncAt: null, profileFound: null, solved: null }).detail).toBe("@imksatyam · not synced yet.");
  });

  it("treats jobs older than 26h as overdue and never-run as to do", () => {
    expect(item({ ...healthy, jobs: { lastMorningAt: hoursAgo(30), lastEveningAt: hoursAgo(2) } }, "jobs").status).toBe("warn");
    expect(item({ ...healthy, jobs: { lastMorningAt: null, lastEveningAt: null } }, "jobs")).toMatchObject({
      status: "todo",
      actions: [{ id: "run-morning" }],
    });
  });

  it("warns when many feeds fail, when backups are old and when the session isn't remembered", () => {
    expect(item({ ...healthy, news: { ...healthy.news, failed: 20 } }, "news").status).toBe("warn");
    expect(item({ ...healthy, backup: { lastExportAt: hoursAgo(24 * 8) } }, "backup").status).toBe("warn");
    expect(item({ ...healthy, backup: { lastExportAt: null } }, "backup").status).toBe("todo");
    expect(item({ ...healthy, session: { remember: false } }, "session").status).toBe("warn");
  });
});

describe("AI features item", () => {
  const withLlm = (llm: SetupInput["llm"]): SetupInput => ({ ...healthy, llm });

  it("is a warning, with no Test button, when nothing is configured", () => {
    const i = item(healthy, "llm");
    expect(i).toMatchObject({ status: "warn", required: false, actions: [] });
    expect(i.detail).toContain("GEMINI_API_KEY or GROQ_API_KEY");
  });

  it("lists the free providers in try order and offers a Test button", () => {
    const i = item(withLlm({ configured: true, provider: "Gemini", free: ["Gemini", "Groq"], paid: { label: "Meta Llama (paid)", ready: false, missing: ["META_LLAMA_API_KEY"] } }), "llm");
    expect(i.status).toBe("ok");
    expect(i.detail).toContain("Gemini then Groq");
    expect(i.detail).toContain("META_LLAMA_API_KEY");
    expect(i.actions).toEqual([{ kind: "button", id: "test-llm", label: "Test" }]);
  });

  it("says the paid provider only runs after confirmation, and never for background jobs", () => {
    const i = item(withLlm({ configured: true, provider: "Gemini", free: ["Gemini"], paid: { label: "Meta Llama (paid)", ready: true, missing: [] } }), "llm");
    expect(i.detail).toContain("after you confirm");
    expect(i.detail).toContain("never for background jobs");
  });

  it("still works with the older single-provider input", () => {
    const i = item(withLlm({ configured: true, provider: "gemini" }), "llm");
    expect(i.status).toBe("ok");
    expect(i.detail).toContain("gemini");
  });

  it("a paid provider alone does not make AI 'configured'", () => {
    const i = item(withLlm({ configured: false, provider: null, free: [], paid: { label: "Meta Llama (paid)", ready: true, missing: [] } }), "llm");
    expect(i.status).toBe("warn");
  });

  it("adds the planner step only when it is known, and requires it", () => {
    expect(buildChecklist(healthy).items.some((i) => i.id === "planner")).toBe(false);
    const todo = { ...healthy, planner: { completed: false } };
    expect(item(todo, "planner")).toMatchObject({ status: "todo", required: true, actions: [{ href: "/plan/setup", label: "Start planning" }] });
    expect(buildChecklist(todo).requiredLeft).toBe(1);
    const done = { ...healthy, planner: { completed: true } };
    expect(item(done, "planner")).toMatchObject({ status: "ok", actions: [{ label: "Edit the plan" }] });
    expect(buildChecklist(done).requiredLeft).toBe(0);
    expect(buildChecklist(done).total).toBe(10);
  });

  it("shows one clear item when the database can't be reached", () => {
    const c = buildUnreachableChecklist("connection refused");
    expect(c).toMatchObject({ total: 1, done: 0, requiredLeft: 1 });
    expect(c.items[0]).toMatchObject({ id: "database", status: "todo", required: true });
    expect(c.items[0]!.detail).toContain("connection refused");
    expect(c.items[0]!.detail).toContain("Network Access");
  });
});
