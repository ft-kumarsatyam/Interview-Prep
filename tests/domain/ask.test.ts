import { describe, expect, it } from "vitest";
import { MAX_PROMPT_CHARS, casePrompt, dsaPrompt, quizPrompt } from "@/modules/ai/domain/ask-prompt";
import { ASK_SUBJECT_IDS, FALLBACK_GEMINI_URL, checkGeminiLink, isAskSubject, resolveGeminiLink, subjectForTopic } from "@/modules/ai/domain/ask-subjects";

describe("subjectForTopic", () => {
  it.each([
    ["js-async", "js", "js"],
    ["node-internals", "node", "js"],
    ["dsa-dp", "dsa", "dsa"],
    ["dbms-transactions", "dbms", "dbms"],
    ["sql-basics", "dbms", "dbms"],
    ["solid", "oop", "lld"],
    ["lld-games", "lld", "lld"],
    ["hld-kv-store", "hld", "hld"],
    ["ai-rag", "ai", "ai"],
    ["os-sync-deadlock", "cs", "os"],
    ["os-concurrency", "cs", "os"],
    ["net-basics", "cs", "hld"],
    ["api-design", "cs", "hld"],
    ["security", "cs", "general"],
    ["behavioral-stories", "behavioral", "general"],
  ])("%s (%s) -> %s", (topic, track, expected) => {
    expect(subjectForTopic(topic, track)).toBe(expected);
  });

  it("only ever returns a known subject", () => {
    for (const track of ["js", "node", "dsa", "dbms", "oop", "lld", "hld", "cs", "ai", "behavioral", "nonsense"]) {
      expect(ASK_SUBJECT_IDS).toContain(subjectForTopic("x", track));
    }
    expect(isAskSubject("dsa")).toBe(true);
    expect(isAskSubject("hack")).toBe(false);
  });
});

describe("checkGeminiLink", () => {
  it("accepts Gemini project and Gem links and normalises them", () => {
    expect(checkGeminiLink(" https://gemini.google.com/gem/abc123 ")).toEqual({ ok: true, url: "https://gemini.google.com/gem/abc123" });
    expect(checkGeminiLink("https://aistudio.google.com/prompts/xyz")).toMatchObject({ ok: true });
    expect(checkGeminiLink("https://notebooklm.google.com/notebook/1")).toMatchObject({ ok: true });
  });

  it("blank clears the link", () => {
    expect(checkGeminiLink("")).toEqual({ ok: true, url: null });
    expect(checkGeminiLink("   ")).toEqual({ ok: true, url: null });
  });

  it.each([
    ["http://gemini.google.com/app", "https"],
    ["https://evil.example.com/gemini.google.com", "Use a link on"],
    ["https://gemini.google.com.evil.com/x", "Use a link on"],
    ["https://user:pw@gemini.google.com/app", "login"],
    ["javascript:alert(1)", "https"],
    ["not a url", "valid link"],
    ["//gemini.google.com/app", "valid link"],
  ])("rejects %s", (raw, message) => {
    const r = checkGeminiLink(raw);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain(message);
  });
});

describe("resolveGeminiLink", () => {
  it("prefers the subject's project, then 'everything else', then Gemini's home", () => {
    expect(resolveGeminiLink({ dsa: "https://gemini.google.com/gem/dsa", general: "https://gemini.google.com/gem/g" }, "dsa")).toBe("https://gemini.google.com/gem/dsa");
    expect(resolveGeminiLink({ general: "https://gemini.google.com/gem/g" }, "dbms")).toBe("https://gemini.google.com/gem/g");
    expect(resolveGeminiLink({}, "os")).toBe(FALLBACK_GEMINI_URL);
  });
});

describe("quizPrompt", () => {
  const base = { prompt: "Which isolation level prevents phantoms in Postgres?", options: ["READ COMMITTED", "REPEATABLE READ", "READ UNCOMMITTED", "None"], correct: [1], explanation: "Postgres RR is snapshot isolation." };

  it("carries the question, what you picked and the right answer", () => {
    const p = quizPrompt({ ...base, chosen: [0], topic: "Transactions" });
    expect(p).toContain("got this quiz question wrong");
    expect(p).toContain("studying Transactions");
    expect(p).toContain("My answer:\nA. READ COMMITTED");
    expect(p).toContain("Correct answer:\nB. REPEATABLE READ");
    expect(p).toContain("snapshot isolation");
  });

  it("handles a skipped question and a multi-select miss", () => {
    expect(quizPrompt({ ...base, chosen: [] })).toContain("(I skipped it)");
    const multi = quizPrompt({ ...base, chosen: [0, 1], correct: [1, 2] });
    expect(multi).toContain("A. READ COMMITTED\nB. REPEATABLE READ");
    expect(multi).toContain("B. REPEATABLE READ\nC. READ UNCOMMITTED");
  });

  it("notes when you were right but want depth, and fences code safely", () => {
    const p = quizPrompt({ ...base, chosen: [1], code: "const x = '```';" });
    expect(p).toContain("answered this correctly");
    expect(p.split("```").length).toBe(3);
  });
});

describe("dsaPrompt", () => {
  it("asks for a hint ladder, never the solution, and includes the code and failure", () => {
    const p = dsaPrompt({ title: "Two Sum", difficulty: "Easy", pattern: "Arrays & Hashing", code: "function twoSum() {}", failure: "2 of 5 cases failed" });
    expect(p).toContain('"Two Sum" (Easy, Arrays & Hashing)');
    expect(p).toContain("Don't give me the full solution");
    expect(p).toContain("2 of 5 cases failed");
    expect(p).toContain("function twoSum() {}");
  });

  it("works with only a title", () => {
    expect(dsaPrompt({ title: "Anything", code: "x" })).toContain('"Anything" in JavaScript');
  });
});

describe("casePrompt", () => {
  it("teaches the case when there is no answer yet", () => {
    const p = casePrompt({ kind: "System Design", title: "Rate limiter", summary: "Limit calls per client." });
    expect(p).toContain("Teach me");
    expect(p).not.toContain("My answer");
  });

  it("critiques your answer when you have written one", () => {
    const p = casePrompt({ kind: "Operating Systems", title: "Deadlocks", prompt: ["Explain deadlock"], answer: "Four conditions..." });
    expect(p).toContain("Critique my answer");
    expect(p).toContain("My answer:\nFour conditions...");
    expect(p).toContain("- Explain deadlock");
  });
});

describe("prompt size", () => {
  it("never exceeds the cap, however much code there is", () => {
    const big = "x".repeat(50_000);
    for (const p of [dsaPrompt({ title: "t", code: big }), quizPrompt({ prompt: big, options: ["a", "b"], chosen: [0], correct: [1] }), casePrompt({ kind: "Databases", title: "t", answer: big })]) {
      expect(p.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS + 20);
    }
  });
});

describe("joinSections", () => {
  it("joins written sections with readable headings and skips empty ones", async () => {
    const { joinSections } = await import("@/modules/ai/domain/ask-prompt");
    expect(joinSections({ definition: "A page is fixed-size.", realSystems: "Linux uses 4 KiB pages.", example: "  ", tradeoffs: undefined })).toBe(
      "Definition:\nA page is fixed-size.\n\nReal Systems:\nLinux uses 4 KiB pages.",
    );
    expect(joinSections({})).toBe("");
  });
});
