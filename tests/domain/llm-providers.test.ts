import { describe, expect, it } from "vitest";
import { DEFAULT_CHAIN, PAID_MAX_TOKENS, describeProviders, parseChain, resolveProviders } from "@/lib/llm/providers";

const ids = (e: Parameters<typeof resolveProviders>[0]) => resolveProviders(e).map((d) => d.id);
const META = { META_LLAMA_API_KEY: "meta-key-123456", META_LLAMA_BASE_URL: "https://llama.example.com/v1", META_LLAMA_MODEL: "some-model" };

describe("resolveProviders", () => {
  it("is empty with nothing configured", () => {
    expect(resolveProviders({})).toEqual([]);
  });

  it("builds Gemini, Groq and Meta from the explicit keys, paid last", () => {
    const defs = resolveProviders({ GEMINI_API_KEY: "g-key-123456", GROQ_API_KEY: "q-key-123456", ...META });
    expect(defs.map((d) => d.id)).toEqual(["gemini", "groq", "meta"]);
    expect(defs.map((d) => d.paid)).toEqual([false, false, true]);
    expect(defs[1]!.cfg.baseUrl).toContain("groq.com");
    expect(defs[2]!.cfg.maxTokens).toBe(PAID_MAX_TOKENS);
  });

  it("keeps the old LLM_PROVIDER / LLM_API_KEY pair working", () => {
    expect(ids({ LLM_API_KEY: "old-key-123456" })).toEqual(["gemini"]);
    expect(ids({ LLM_PROVIDER: "openai-compatible", LLM_API_KEY: "old-key-123456" })).toEqual(["groq"]);
    expect(ids({ LLM_PROVIDER: "openai-compatible", LLM_API_KEY: "k-123456", LLM_BASE_URL: "https://openrouter.ai/api/v1" })).toEqual(["custom"]);
    expect(ids({ LLM_PROVIDER: "anthropic", LLM_API_KEY: "k-123456" })).toEqual(["anthropic"]);
  });

  it("an explicit key beats the legacy pair for the same slot", () => {
    const [def] = resolveProviders({ GEMINI_API_KEY: "new-key-123456", LLM_API_KEY: "old-key-123456" });
    expect(def!.cfg.apiKey).toBe("new-key-123456");
  });

  it("adds a legacy provider the chain list does not name, ahead of the paid one", () => {
    expect(ids({ GEMINI_API_KEY: "g-key-123456", LLM_PROVIDER: "anthropic", LLM_API_KEY: "a-key-123456", ...META })).toEqual(["gemini", "anthropic", "meta"]);
  });

  it("the paid provider needs a key, an https base URL and a model", () => {
    expect(ids({ META_LLAMA_API_KEY: "k-123456" })).toEqual([]);
    expect(ids({ ...META, META_LLAMA_BASE_URL: "http://insecure.example.com" })).toEqual([]);
    expect(ids({ ...META, META_LLAMA_MODEL: undefined })).toEqual([]);
    expect(ids(META)).toEqual(["meta"]);
  });

  it("follows LLM_CHAIN but still puts the paid provider last", () => {
    const e = { GEMINI_API_KEY: "g-key-123456", GROQ_API_KEY: "q-key-123456", ...META };
    expect(ids({ ...e, LLM_CHAIN: "groq,gemini" })).toEqual(["groq", "gemini", "meta"]);
    expect(ids({ ...e, LLM_CHAIN: "meta,groq,gemini" })).toEqual(["groq", "gemini", "meta"]);
  });
});

describe("parseChain", () => {
  it("defaults, ignores unknown names and dedupes", () => {
    expect(parseChain(undefined)).toEqual([...DEFAULT_CHAIN]);
    expect(parseChain("  ")).toEqual([...DEFAULT_CHAIN]);
    expect(parseChain("Groq, nonsense, groq gemini")).toEqual(["groq", "gemini"]);
  });
});

describe("describeProviders", () => {
  it("says what is missing and never includes a key", () => {
    const status = describeProviders({ GEMINI_API_KEY: "super-secret-key", META_LLAMA_API_KEY: "meta-secret-key" });
    expect(status.find((s) => s.id === "gemini")).toMatchObject({ configured: true, missing: [] });
    expect(status.find((s) => s.id === "groq")).toMatchObject({ configured: false, missing: ["GROQ_API_KEY"] });
    expect(status.find((s) => s.id === "meta")!.missing).toEqual(["META_LLAMA_BASE_URL (https)", "META_LLAMA_MODEL"]);
    expect(JSON.stringify(status)).not.toContain("secret");
  });
});
