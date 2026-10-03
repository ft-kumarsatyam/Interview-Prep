import { describe, expect, it } from "vitest";
import { BRIDGE_MAX_PROMPT, buildAskRequest, parseAskRequest, parseBridgeReply, resultMessage } from "@/lib/domain/ask-bridge";

const URL_OK = "https://gemini.google.com/app";

describe("ask bridge", () => {
  it("round-trips a request", () => {
    expect(parseAskRequest(buildAskRequest("a1", "hello", URL_OK))).toMatchObject({ id: "a1", prompt: "hello", url: URL_OK });
  });

  it("truncates an oversized prompt when building", () => {
    expect(buildAskRequest("a", "x".repeat(BRIDGE_MAX_PROMPT + 50), URL_OK).prompt).toHaveLength(BRIDGE_MAX_PROMPT);
  });

  it.each([
    ["wrong source", { ...buildAskRequest("a", "p", URL_OK), source: "evil" }],
    ["off-host url", buildAskRequest("a", "p", "https://evil.example/app")],
    ["http url", buildAskRequest("a", "p", "http://gemini.google.com/app")],
    ["login in url", buildAskRequest("a", "p", "https://u:p@gemini.google.com/app")],
    ["empty prompt", buildAskRequest("a", "  ", URL_OK)],
    ["no id", buildAskRequest("", "p", URL_OK)],
    ["null", null],
    ["string", "ask-gemini"],
  ])("rejects %s", (_n, data) => {
    expect(parseAskRequest(data)).toBeNull();
  });

  it("parses extension replies and drops unknown ones", () => {
    expect(parseBridgeReply({ source: "prepos-ext", type: "received", id: "a" })).toEqual({ source: "prepos-ext", type: "received", id: "a" });
    expect(parseBridgeReply({ source: "prepos-ext", type: "result", id: "a", ok: false, reason: "timeout" })).toMatchObject({ ok: false, reason: "timeout" });
    expect(parseBridgeReply({ source: "prepos-ext", type: "result", id: "a", ok: false, reason: "weird" })).not.toHaveProperty("reason");
    expect(parseBridgeReply({ source: "x", type: "received", id: "a" })).toBeNull();
  });

  it("describes results", () => {
    expect(resultMessage({ source: "prepos-ext", type: "result", id: "a", ok: true })).toMatch(/Sent/);
    expect(resultMessage({ source: "prepos-ext", type: "result", id: "a", ok: false, reason: "no-input" })).toMatch(/paste/);
  });
});
