import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaidFallbackNotice } from "@/modules/ai/components/paid-fallback-notice";
import { AiPanel } from "@/modules/settings/components/ai-panel";
import type { ProviderRow } from "@/modules/ai/services/ai";

const row = (over: Partial<ProviderRow>): ProviderRow => ({ id: "gemini", label: "Gemini", paid: false, configured: true, missing: [], health: "ok", note: null, ...over });

describe("PaidFallbackNotice", () => {
  it("asks before spending, shows the cap, and offers the three choices", () => {
    const html = renderToStaticMarkup(createElement(PaidFallbackNotice, { used: 3, cap: 20, onUseOnce: () => {}, onAllowToday: () => {}, onCancel: () => {} }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("bills your card");
    expect(html).toContain("3 of 20 paid calls used today");
    for (const label of ["Use once", "Allow today", "Cancel"]) expect(html).toContain(label);
  });

  it("disables the choices while a request is running", () => {
    const html = renderToStaticMarkup(createElement(PaidFallbackNotice, { used: 0, cap: 5, busy: true, onUseOnce: () => {}, onAllowToday: () => {}, onCancel: () => {} }));
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});

describe("AiPanel", () => {
  const providers = [
    row({}),
    row({ id: "groq", label: "Groq", configured: false, missing: ["GROQ_API_KEY"] }),
    row({ id: "meta", label: "Meta Llama (paid)", paid: true, health: "cooldown", note: "Out of quota or rate limited: skipped until about 11:30 pm." }),
  ];

  it("shows each provider, what's missing, and flags the paid one as costing money", () => {
    const html = renderToStaticMarkup(createElement(AiPanel, { providers, usage: [] }));
    expect(html).toContain("Gemini");
    expect(html).toContain("Needs GROQ_API_KEY");
    expect(html).toContain("last resort, costs money");
    expect(html).toContain("skipped until about 11:30 pm");
    expect(html).toContain("No AI calls yet today");
  });

  it("only offers the paid test when that provider is configured, and always warns it costs money", () => {
    expect(renderToStaticMarkup(createElement(AiPanel, { providers: [row({})], usage: [] }))).not.toContain("Test paid");
    expect(renderToStaticMarkup(createElement(AiPanel, { providers, usage: [] }))).toContain("Test paid provider (costs money)");
  });

  it("disables the free test when no free provider is configured", () => {
    const html = renderToStaticMarkup(createElement(AiPanel, { providers: [row({ configured: false, missing: ["GEMINI_API_KEY"] })], usage: [] }));
    expect(html).toMatch(/disabled=""[^>]*>Test free providers/);
  });

  it("summarises usage including cached answers", () => {
    const html = renderToStaticMarkup(
      createElement(AiPanel, {
        providers,
        usage: [
          { provider: "gemini", calls: 4, fails: 1, cacheHits: 0 },
          { provider: "cache", calls: 0, fails: 0, cacheHits: 7 },
        ],
      }),
    );
    expect(html).toContain("4 calls, 1 failed");
    expect(html).toContain("7 served");
  });

  it("never renders anything that looks like a key", () => {
    expect(renderToStaticMarkup(createElement(AiPanel, { providers, usage: [] }))).not.toMatch(/AIza|gsk_|sk-/);
  });
});

import { AiProvider } from "@/modules/ai/components/ai-context";
import { AskGemini } from "@/modules/ai/components/ask-gemini";
import { QuestionAiTools } from "@/modules/quiz/components/question-ai-tools";

const q = { prompt: "Which keyword declares a block-scoped variable?", options: ["var", "let", "function", "goto"], chosen: [0], correct: [1], explanation: "let is block scoped." };
const withAi = (aiAvailable: boolean, child: ReactNode) => renderToStaticMarkup(createElement(AiProvider, { links: {}, aiAvailable }, child));

describe("QuestionAiTools", () => {
  it("offers Explain my mistake only when an AI provider is configured", () => {
    expect(withAi(true, createElement(QuestionAiTools, { question: q, subject: "js" }))).toContain("Explain my mistake");
    expect(withAi(false, createElement(QuestionAiTools, { question: q, subject: "js" }))).not.toContain("Explain my mistake");
  });

  it("always offers Ask Gemini, even with no API key, and tolerates an unknown subject", () => {
    expect(withAi(false, createElement(QuestionAiTools, { question: q, subject: "js" }))).toContain("Ask Gemini");
    expect(withAi(false, createElement(QuestionAiTools, { question: q, subject: "not-a-subject" }))).toContain("Ask Gemini");
    expect(withAi(false, createElement(QuestionAiTools, { question: q }))).toContain("Ask Gemini");
  });

  it("renders no result box until you ask", () => {
    expect(withAi(true, createElement(QuestionAiTools, { question: q }))).not.toContain('role="status"');
  });
});

describe("AskGemini", () => {
  it("renders a button with the label and explains what it does", () => {
    const html = withAi(false, createElement(AskGemini, { subject: "dsa", prompt: "p", label: "Ask Gemini about my code" }));
    expect(html).toContain("Ask Gemini about my code");
    expect(html).toContain("Copies a ready-made prompt and opens your Gemini project");
    expect(html).toContain('type="button"');
  });
});
