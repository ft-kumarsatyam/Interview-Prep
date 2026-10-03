// Finds your open Gemini tab (or opens one), focuses it, types the prompt and sends it.
const GEMINI_ORIGIN = "https://gemini.google.com";

/**
 * Runs inside the Gemini tab. Selectors live here only: Gemini's markup changes, so if filling
 * stops working this is the one place to update.
 */
async function fillGemini(prompt) {
  const INPUT = ['rich-textarea .ql-editor[contenteditable="true"]', 'div.ql-editor[contenteditable="true"]', 'div[contenteditable="true"][role="textbox"]', "textarea"];
  const SEND = ["button.send-button", 'button[aria-label*="Send" i]', ".send-button-container button"];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const first = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  let input = null;
  for (let i = 0; i < 50 && !input; i++) {
    input = first(INPUT);
    if (!input) await sleep(200);
  }
  if (!input) return { ok: false, reason: "no-input" };

  input.focus();
  if (input.tagName === "TEXTAREA") {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(input, prompt);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, prompt);
  }

  for (let i = 0; i < 25; i++) {
    const btn = first(SEND);
    if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") {
      btn.click();
      return { ok: true };
    }
    await sleep(200);
  }
  return { ok: false, reason: "timeout" };
}

function waitComplete(tabId) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") done();
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(done, 20000);
  });
}

async function pickTab(url) {
  const tabs = await chrome.tabs.query({ url: `${GEMINI_ORIGIN}/*` });
  if (tabs.length === 0) return null;
  const want = new URL(url);
  const exact = tabs.find((t) => t.url && new URL(t.url).pathname === want.pathname);
  if (exact) return exact;
  return tabs.toSorted((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
}

async function ask({ prompt, url }) {
  let tab = await pickTab(url);
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    if (!url.startsWith(`${GEMINI_ORIGIN}/`)) return { ok: false, reason: "blocked" };
    tab = await chrome.tabs.create({ url, active: true });
    await waitComplete(tab.id);
  }
  const [out] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fillGemini, args: [prompt] });
  return out?.result ?? { ok: false, reason: "error" };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "ask-gemini" || typeof msg.prompt !== "string" || typeof msg.url !== "string") return false;
  // Only the PrepOS content script (a tab of ours) may drive this.
  if (!sender.tab) return false;
  ask(msg).then(sendResponse, () => sendResponse({ ok: false, reason: "error" }));
  return true;
});
