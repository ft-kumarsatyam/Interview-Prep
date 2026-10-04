import { afterEach, describe, expect, it, vi } from "vitest";
import { anthropicStream, geminiStream, openaiCompatibleStream } from "@/core/llm/adapters";
import { sseData } from "@/core/llm/sse";

afterEach(() => vi.unstubAllGlobals());

/** A body that arrives in the given pieces, so event boundaries can fall anywhere. */
function body(pieces: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const p of pieces) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}
async function all<T>(g: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of g) out.push(x);
  return out;
}
const sse = (...events: string[]) => events.map((e) => `data: ${e}\n\n`).join("");

describe("sseData", () => {
  it("yields each event's data", async () => {
    expect(await all(sseData(body([sse("a", "b")])))).toEqual(["a", "b"]);
  });
  it("handles events split across chunks, even mid-line and mid-boundary", async () => {
    const text = sse('{"x":1}', '{"x":2}');
    for (let cut = 1; cut < text.length; cut += 3) {
      expect(await all(sseData(body([text.slice(0, cut), text.slice(cut)])))).toEqual(['{"x":1}', '{"x":2}']);
    }
  });
  it("supports CRLF, multi-line data, comments and event names", async () => {
    expect(await all(sseData(body([": keepalive\r\n\r\nevent: x\r\ndata: one\r\ndata: two\r\n\r\n"])))).toEqual(["one\ntwo"]);
  });
  it("delivers a final event with no trailing blank line, and ignores empty input", async () => {
    expect(await all(sseData(body(["data: tail"])))).toEqual(["tail"]);
    expect(await all(sseData(body([])))).toEqual([]);
  });
  it("keeps multi-byte characters intact across chunks", async () => {
    const enc = new TextEncoder().encode("data: héllo ✓\n\n");
    const s = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.slice(0, 8)); // cuts inside "é"
        c.enqueue(enc.slice(8));
        c.close();
      },
    });
    expect(await all(sseData(s))).toEqual(["héllo ✓"]);
  });
});

const stubFetch = (pieces: string[], status = 200) => {
  const fn = vi.fn(async () => new Response(body(pieces), { status, headers: { "content-type": "text/event-stream" } }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

describe("streaming adapters", () => {
  it("gemini: joins the text parts of each event and hits the SSE endpoint", async () => {
    const f = stubFetch([sse(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hel" }] } }] }), JSON.stringify({ candidates: [{ content: { parts: [{ text: "lo" }, { text: "!" }] } }] }))]);
    expect((await all(geminiStream({ provider: "gemini", apiKey: "k-123" })("hi"))).join("")).toBe("Hello!");
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toContain(":streamGenerateContent?alt=sse");
  });

  it("openai-compatible: yields delta content, skips empties and stops at [DONE]", async () => {
    const ev = (c: string | null) => JSON.stringify({ choices: [{ delta: c === null ? {} : { content: c } }] });
    stubFetch([sse(ev(null), ev("A"), ev("B"), "[DONE]", ev("never"))]);
    expect((await all(openaiCompatibleStream({ provider: "openai-compatible", apiKey: "k-123" })("hi"))).join("")).toBe("AB");
  });

  it("anthropic: only content_block_delta text counts", async () => {
    stubFetch([sse(JSON.stringify({ type: "message_start" }), JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "x" } }), JSON.stringify({ type: "content_block_delta", delta: { text: "y" } }), JSON.stringify({ type: "message_stop" }))]);
    expect((await all(anthropicStream({ provider: "anthropic", apiKey: "k-123" })("hi"))).join("")).toBe("xy");
  });

  it("ignores non-JSON keep-alive data lines", async () => {
    stubFetch([sse("ping", JSON.stringify({ choices: [{ delta: { content: "ok" } }] }))]);
    expect(await all(openaiCompatibleStream({ provider: "openai-compatible", apiKey: "k-123" })("hi"))).toEqual(["ok"]);
  });

  it("throws a classified HTTP error and never leaks the key", async () => {
    stubFetch(["quota exceeded for key k-secret-123"], 429);
    const err = await all(geminiStream({ provider: "gemini", apiKey: "k-secret-123" })("hi")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message)).toContain("429");
    expect(String((err as Error).message)).not.toContain("k-secret-123");
  });
});
