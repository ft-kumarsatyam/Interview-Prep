// Runs on the PrepOS page. Relays "ask-gemini" requests to the background worker and reports back.
// Mirrors modules/ai/domain/ask-bridge.ts: keep the constants and checks in sync.
const SOURCE_APP = "prepos-app";
const SOURCE_EXT = "prepos-ext";
const ATTR = "data-prepos-ext";
const MAX_PROMPT = 8000;
const GEMINI_HOSTS = ["gemini.google.com", "aistudio.google.com", "notebooklm.google.com"];

function isGeminiUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && GEMINI_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

function parse(data) {
  if (!data || typeof data !== "object") return null;
  if (data.source !== SOURCE_APP || data.type !== "ask-gemini") return null;
  if (typeof data.id !== "string" || !data.id || data.id.length > 64) return null;
  if (typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > MAX_PROMPT) return null;
  if (typeof data.url !== "string" || !isGeminiUrl(data.url)) return null;
  return { id: data.id, prompt: data.prompt, url: data.url };
}

function reply(msg) {
  window.postMessage({ source: SOURCE_EXT, ...msg }, window.location.origin);
}

function isPrepOs() {
  return !!document.querySelector('meta[name="prepos-app"]');
}

function arm() {
  if (!isPrepOs()) return false;
  document.documentElement.setAttribute(ATTR, "1");
  return true;
}

// The meta tag streams in after document_start, so wait for it before announcing.
if (!arm()) {
  const obs = new MutationObserver(() => {
    if (arm()) obs.disconnect();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("DOMContentLoaded", () => obs.disconnect(), { once: true });
}

// Job and profile captures: background -> this script -> the page (which validates and saves them).
// Mirrors modules/jobs/domain/capture-bridge.ts.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "capture" || !document.documentElement.hasAttribute(ATTR)) return;
  reply({ type: "capture", id: msg.id, payload: msg.payload });
});

function handleCaptureMessage(data) {
  if (!data || typeof data !== "object" || data.source !== SOURCE_APP) return false;
  if (data.type === "drain-captures") {
    chrome.runtime.sendMessage({ type: "drain" }, (list) => {
      if (chrome.runtime.lastError || !Array.isArray(list)) return;
      for (const c of list) reply({ type: "capture", id: c.id, payload: c.payload });
    });
    return true;
  }
  if (data.type === "capture-ack" && typeof data.id === "string" && data.id.length <= 64) {
    chrome.runtime.sendMessage({ type: "ack", id: data.id });
    return true;
  }
  return false;
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (!document.documentElement.hasAttribute(ATTR)) return;
  if (handleCaptureMessage(event.data)) return;
  const req = parse(event.data);
  if (!req) return;
  reply({ type: "received", id: req.id });
  chrome.runtime.sendMessage({ type: "ask-gemini", prompt: req.prompt, url: req.url }, (res) => {
    if (chrome.runtime.lastError || !res) return reply({ type: "result", id: req.id, ok: false, reason: "error" });
    reply({ type: "result", id: req.id, ok: !!res.ok, ...(res.reason ? { reason: res.reason } : {}) });
  });
});
