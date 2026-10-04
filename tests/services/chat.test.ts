import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import type { LlmProvider } from "@/core/llm/types";
import type { ChatEvent } from "@/modules/chat/domain/chat-events";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

/** A fake model: the planner picks `tools`, the answer streams `reply` in two chunks and records each prompt. */
function fakeLlm(opts: { tools?: Array<{ name: string; query?: string }>; reply?: string; failStream?: boolean; prompts?: string[] } = {}): LlmProvider {
  return {
    name: "fake",
    lastProvider: "Fake",
    async generateJson<T>(prompt: string, schema: ZodType<T>) {
      opts.prompts?.push(prompt);
      return schema.parse({ tools: opts.tools ?? [] });
    },
    async *streamText(prompt: string) {
      opts.prompts?.push(prompt);
      const reply = opts.reply ?? "Hello there.";
      yield reply.slice(0, 5);
      if (opts.failStream) throw new Error("boom");
      yield reply.slice(5);
    },
  };
}

async function collect(gen: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const out: ChatEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("chat service", () => {
  it("creates a thread and saves your message even with no AI provider", async () => {
    const { runTurn, listThreads, getThread } = await import("@/modules/chat/services/chat");
    const events = await collect(runTurn({ message: "How is my streak going?" }, { llm: null }));
    expect(events[0]).toMatchObject({ type: "thread", title: "How is my streak going", created: true });
    expect(events.at(-1)).toMatchObject({ type: "error", unavailable: true });
    const [thread] = await listThreads();
    expect(thread!.title).toBe("How is my streak going");
    const detail = await getThread(thread!.id);
    expect(detail!.messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("plans tools, streams the answer, saves it and continues the same thread with history", async () => {
    const { runTurn, getThread } = await import("@/modules/chat/services/chat");
    const prompts: string[] = [];
    const first = await collect(runTurn({ message: "How does the streak work?" }, { llm: fakeLlm({ tools: [{ name: "app-guide" }], reply: "Pass the quiz daily.", prompts }) }));
    expect(first.map((e) => e.type)).toEqual(["thread", "tools", "token", "token", "done"]);
    expect(first[1]).toEqual({ type: "tools", tools: [{ name: "app-guide", label: "How PrepOS works" }] });
    expect(prompts[1]).toContain('<data tool="app-guide"');
    expect(prompts[1]).toContain("mandatory for the streak");

    const threadId = (first[0] as Extract<ChatEvent, { type: "thread" }>).threadId;
    const second = await collect(runTurn({ threadId, message: "And freezes?" }, { llm: fakeLlm({ reply: "Freezes bridge a day.", prompts }) }));
    expect(second[0]).toMatchObject({ type: "thread", created: false });
    expect(prompts.at(-1)).toContain("Pass the quiz daily.");

    const detail = await getThread(threadId);
    expect(detail!.messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "How does the streak work?"],
      ["assistant", "Pass the quiz daily."],
      ["user", "And freezes?"],
      ["assistant", "Freezes bridge a day."],
    ]);
    expect(detail!.messages[1]!.tools).toEqual([{ name: "app-guide", label: "How PrepOS works" }]);
    expect(detail!.thread.messageCount).toBe(4);
  });

  it("keeps a cut-off answer marked as failed and leaves it out of later context", async () => {
    const { runTurn, getThread } = await import("@/modules/chat/services/chat");
    const events = await collect(runTurn({ message: "hi" }, { llm: fakeLlm({ reply: "Partial answer", failStream: true }) }));
    expect(events.at(-1)).toMatchObject({ type: "error" });
    const threadId = (events[0] as Extract<ChatEvent, { type: "thread" }>).threadId;
    const detail = await getThread(threadId);
    expect(detail!.messages.at(-1)).toMatchObject({ role: "assistant", failed: true, text: "Parti" });
  });

  it("rejects bad input and unknown threads", async () => {
    const { runTurn } = await import("@/modules/chat/services/chat");
    expect((await collect(runTurn({ message: "" }, { llm: null })))[0]).toMatchObject({ type: "error" });
    expect((await collect(runTurn({ message: "hi", threadId: "0123456789abcdef01234567" }, { llm: null })))[0]).toMatchObject({ type: "error", error: "That conversation no longer exists." });
  });

  it("renames, searches, archives and deletes threads with their messages", async () => {
    const { runTurn, listThreads, renameThread, setThreadArchived, deleteThread, getThread } = await import("@/modules/chat/services/chat");
    await collect(runTurn({ message: "first topic" }, { llm: null }));
    await collect(runTurn({ message: "second topic" }, { llm: null }));
    const [a, b] = await listThreads();
    expect(await renameThread(a!.id, "  Renamed   thread ")).toBe(true);
    expect((await listThreads({ q: "renamed" })).map((t) => t.title)).toEqual(["Renamed thread"]);
    expect(await setThreadArchived(b!.id, true)).toBe(true);
    expect((await listThreads()).map((t) => t.id)).toEqual([a!.id]);
    expect((await listThreads({ archived: true })).map((t) => t.id)).toEqual([b!.id]);
    expect(await deleteThread(a!.id)).toBe(true);
    expect(await getThread(a!.id)).toBeNull();
    const { ChatMessage } = await import("@/core/models/chat");
    expect(await ChatMessage.countDocuments({ threadId: a!.id })).toBe(0);
    expect(await deleteThread("not-an-id")).toBe(false);
  });
});
