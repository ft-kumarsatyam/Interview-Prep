import { describe, expect, it } from "vitest";
import { buildChecklist, type SetupInput } from "@/lib/domain/setup";

const now = new Date("2026-10-02T14:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const healthy: SetupInput = {
  now,
  content: { problems: 669, expectedProblems: 669, topics: 70, expectedTopics: 70 },
  secrets: { authSecretLength: 44, cronSecretLength: 64 },
  leetcode: { username: "imksatyam", lastSyncAt: hoursAgo(1), lastError: null, profileFound: true, solved: 11 },
  jobs: { lastMorningAt: hoursAgo(8), lastEveningAt: hoursAgo(18) },
  news: { lastFetchAt: hoursAgo(8), failed: 2, feeds: 51 },
  notify: { telegram: true, email: false },
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
