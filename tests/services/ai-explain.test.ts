import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { AiCache } from "@/lib/models/ai";
import { explainAnswer } from "@/lib/services/ai-explain";
import { mongoLlmStore } from "@/lib/services/llm-store";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ["GEMINI_API_KEY", "GROQ_API_KEY", "META_LLAMA_API_KEY", "META_LLAMA_BASE_URL", "META_LLAMA_MODEL"]) delete process.env[k];
  resetEnvForTests();
});

const question = {
  prompt: "Which isolation level prevents phantoms in Postgres?",
  options: ["READ COMMITTED", "REPEATABLE READ", "READ UNCOMMITTED", "None"],
  chosen: [0],
  correct: [1],
  explanation: "Postgres RR is snapshot isolation.",
};
const answer = { explanation: "In Postgres, REPEATABLE READ is snapshot isolation, so a transaction never sees rows committed after it started.", whyYourAnswerWasWrong: "READ COMMITTED takes a fresh snapshot per statement.", remember: "Postgres RR = snapshot." };

const chat = (body: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(body) } }] }), { status: 200 });
const gemini = (body: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 });
const host = (u: unknown) => new URL(String(u)).hostname;

function keys(extra: Record<string, string> = {}) {
  Object.assign(process.env, { GEMINI_API_KEY: "gem-key-1234567", GROQ_API_KEY: "groq-key-1234567", ...extra });
  resetEnvForTests();
}

describe("explainAnswer", () => {
  it("says so when no AI provider is configured", async () => {
    resetEnvForTests();
    expect(await explainAnswer(question)).toMatchObject({ ok: false, unavailable: true });
  });

  it("explains once, then serves the same question from the cache without calling a provider", async () => {
    keys();
    const fetchMock = vi.fn(async (u: unknown) => (host(u).includes("groq") ? chat(answer) : gemini(answer)));
    vi.stubGlobal("fetch", fetchMock);

    const first = await explainAnswer(question);
    expect(first).toMatchObject({ ok: true, cached: false, provider: "Groq" });
    const second = await explainAnswer(question);
    expect(second).toMatchObject({ ok: true, cached: true, explanation: answer });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await AiCache.countDocuments()).toBe(1);
  });

  it("a different wrong answer is a different explanation", async () => {
    keys();
    const fetchMock = vi.fn(async () => chat(answer));
    vi.stubGlobal("fetch", fetchMock);
    await explainAnswer(question);
    await explainAnswer({ ...question, chosen: [2] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still serves a cached explanation when every provider is out of quota, and never asks about paying", async () => {
    keys({ META_LLAMA_API_KEY: "meta-key-1234567", META_LLAMA_BASE_URL: "https://llama.example.com/v1", META_LLAMA_MODEL: "m1" });
    vi.stubGlobal("fetch", vi.fn(async () => chat(answer)));
    await explainAnswer(question);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    const again = await explainAnswer(question);
    expect(again).toMatchObject({ ok: true, cached: true });
  });

  it("asks before using the paid provider for a new question when the free ones are out", async () => {
    keys({ META_LLAMA_API_KEY: "meta-key-1234567", META_LLAMA_BASE_URL: "https://llama.example.com/v1", META_LLAMA_MODEL: "m1" });
    const fetchMock = vi.fn(async (u: unknown) => (host(u).includes("llama.example.com") ? chat(answer) : new Response("slow down", { status: 429 })));
    vi.stubGlobal("fetch", fetchMock);

    const res = await explainAnswer(question);
    expect(res).toMatchObject({ ok: false, needsPaid: { used: 0, cap: 20 } });
    expect(fetchMock.mock.calls.some(([u]) => host(u).includes("llama.example.com"))).toBe(false);

    const confirmed = await explainAnswer(question, { paidOnce: true });
    expect(confirmed).toMatchObject({ ok: true, cached: false, provider: "Meta Llama (paid)" });
    expect(await mongoLlmStore("Asia/Kolkata").paidUsedToday()).toBe(1);
  });

  it("does not cache a malformed model reply, and reports a plain error", async () => {
    keys();
    vi.stubGlobal("fetch", vi.fn(async () => chat({ nope: true })));
    const res = await explainAnswer(question);
    expect(res.ok).toBe(false);
    expect(await AiCache.countDocuments()).toBe(0);
  });

  it("rejects malformed input without calling any provider", async () => {
    keys();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await explainAnswer({ prompt: "x" })).toMatchObject({ ok: false });
    expect(await explainAnswer({ ...question, options: ["only one"] })).toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores option indices that point past the options", async () => {
    keys();
    vi.stubGlobal("fetch", vi.fn(async () => chat(answer)));
    const a = await explainAnswer({ ...question, chosen: [0, 5] }); // 5 is a valid index in general but not for 4 options
    const b = await explainAnswer(question);
    expect(a.ok && b.ok && b.cached).toBe(true);
  });
});
