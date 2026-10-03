/**
 * Messages between the app page and the PrepOS Chrome extension (extension/).
 * The extension is plain JS and mirrors these constants and checks; keep both in sync.
 * Pure: building and validating messages only.
 */
import { GEMINI_HOSTS } from "./ask-subjects";

export const BRIDGE_SOURCE_APP = "prepos-app";
export const BRIDGE_SOURCE_EXT = "prepos-ext";
/** The extension sets this data attribute on <html> once its content script runs. */
export const BRIDGE_ATTR = "data-prepos-ext";
export const BRIDGE_MAX_PROMPT = 8000;

export interface AskRequest {
  source: typeof BRIDGE_SOURCE_APP;
  type: "ask-gemini";
  id: string;
  prompt: string;
  /** The project/Gem link for the subject, opened only when no Gemini tab is already open. */
  url: string;
}

export type BridgeReply =
  | { source: typeof BRIDGE_SOURCE_EXT; type: "received"; id: string }
  | { source: typeof BRIDGE_SOURCE_EXT; type: "result"; id: string; ok: boolean; reason?: "no-input" | "timeout" | "blocked" | "error" };

export function buildAskRequest(id: string, prompt: string, url: string): AskRequest {
  return { source: BRIDGE_SOURCE_APP, type: "ask-gemini", id, prompt: prompt.slice(0, BRIDGE_MAX_PROMPT), url };
}

export function isGeminiUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && (GEMINI_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

/** Accepts only well-formed requests aimed at a Google AI host. */
export function parseAskRequest(data: unknown): AskRequest | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.source !== BRIDGE_SOURCE_APP || d.type !== "ask-gemini") return null;
  if (typeof d.id !== "string" || d.id.length === 0 || d.id.length > 64) return null;
  if (typeof d.prompt !== "string" || d.prompt.trim() === "" || d.prompt.length > BRIDGE_MAX_PROMPT) return null;
  if (typeof d.url !== "string" || !isGeminiUrl(d.url)) return null;
  return { source: BRIDGE_SOURCE_APP, type: "ask-gemini", id: d.id, prompt: d.prompt, url: d.url };
}

export function parseBridgeReply(data: unknown): BridgeReply | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.source !== BRIDGE_SOURCE_EXT || typeof d.id !== "string") return null;
  if (d.type === "received") return { source: BRIDGE_SOURCE_EXT, type: "received", id: d.id };
  if (d.type === "result" && typeof d.ok === "boolean") {
    const reasons = ["no-input", "timeout", "blocked", "error"] as const;
    const reason = reasons.find((r) => r === d.reason);
    return { source: BRIDGE_SOURCE_EXT, type: "result", id: d.id, ok: d.ok, ...(reason ? { reason } : {}) };
  }
  return null;
}

export function resultMessage(reply: Extract<BridgeReply, { type: "result" }>): string {
  if (reply.ok) return "Sent to your Gemini tab.";
  switch (reply.reason) {
    case "no-input":
    case "timeout":
      return "Gemini is open, but the box wasn't ready. The prompt is copied: paste it.";
    default:
      return "Couldn't fill Gemini. The prompt is copied: paste it.";
  }
}
