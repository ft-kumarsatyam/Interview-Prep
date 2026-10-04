import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JobPosting } from "@/core/models/job-postings";
import { Settings } from "@/core/models/system";
import type { AskEvent } from "@/modules/ai/domain/ask-events";
import type { LlmProvider } from "@/core/llm/types";
import { ingestPushed } from "@/modules/jobs/services/job-ingest";
import { chatAboutJob } from "@/modules/jobs/services/job-chat";
import { saveBaseResume } from "@/modules/resume/services/resume";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await JobPosting.syncIndexes();
});

const RESUME = "Aarav Mehta. Backend engineer. Built payment APIs in Node.js and PostgreSQL serving 2,000 requests per second.";

function llm(chunks: string[], opts: { fail?: boolean } = {}): LlmProvider & { prompts: string[] } {
  const p = {
    name: "fake",
    lastProvider: "gemini",
    prompts: [] as string[],
    async generateJson() {
      throw new Error("unused");
    },
    async *streamText(prompt: string) {
      p.prompts.push(prompt);
      if (opts.fail) throw new Error("boom");
      for (const c of chunks) yield c;
    },
  };
  return p as unknown as LlmProvider & { prompts: string[] };
}
async function run(gen: AsyncGenerator<AskEvent>) {
  const out: AskEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}
async function seed() {
  await ingestPushed([{ title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/1", description: "Node.js and PostgreSQL role." }]);
  return String((await JobPosting.findOne({}).lean())!._id);
}

describe("chatAboutJob", () => {
  it("streams tokens, then a done event, using the job and the resume in the prompt", async () => {
    await saveBaseResume(RESUME);
    const id = await seed();
    const m = llm(["Stress your ", "Node.js work."]);
    const events = await run(chatAboutJob({ kind: "posting", id }, "What should I stress?", [], { llm: m }));
    expect(events.map((e) => e.type)).toEqual(["sources", "token", "token", "done"]);
    expect(events.at(-1)).toMatchObject({ type: "done", result: { answer: "Stress your Node.js work.", grounded: true, provider: "gemini" } });
    expect(m.prompts[0]).toContain("Backend Engineer");
    expect(m.prompts[0]).toContain("payment APIs");
    expect(m.prompts[0]).toContain("<resume>");
  });

  it("works without a resume and says so in the prompt", async () => {
    const id = await seed();
    const m = llm(["ok"]);
    await run(chatAboutJob({ kind: "posting", id }, "What will they ask?", [], { llm: m }));
    expect(m.prompts[0]).toContain("has not saved a resume");
  });

  it("passes only valid recent history and ignores a malformed one", async () => {
    const id = await seed();
    const m = llm(["ok"]);
    await run(chatAboutJob({ kind: "posting", id }, "And the second round?", [{ role: "you", text: "first question" }, { role: "assistant", text: "first answer" }], { llm: m }));
    expect(m.prompts[0]).toContain("Candidate: first question");
    expect(m.prompts[0]).toContain("Coach: first answer");
    const m2 = llm(["ok"]);
    await run(chatAboutJob({ kind: "posting", id }, "Another question?", [{ role: "hacker", text: 1 }], { llm: m2 }));
    expect(m2.prompts[0]).not.toContain("<chat>\n");
  });

  it("reports a missing job, a bad question, no provider and an interrupted stream as error events", async () => {
    const id = await seed();
    expect((await run(chatAboutJob({ kind: "posting", id: "a".repeat(24) }, "What now?", [], { llm: llm(["x"]) })))[0]).toMatchObject({ type: "error", error: expect.stringContaining("no longer") });
    expect((await run(chatAboutJob({ kind: "posting", id }, "hi", [], { llm: llm(["x"]) })))[0]).toMatchObject({ type: "error" });
    expect((await run(chatAboutJob({ kind: "posting", id }, "What now?", [], { llm: null }))).at(-1)).toMatchObject({ type: "error", unavailable: true });
    expect((await run(chatAboutJob({ kind: "posting", id }, "What now?", [], { llm: llm([], { fail: true }) }))).at(-1)).toMatchObject({ type: "error" });
  });
});
