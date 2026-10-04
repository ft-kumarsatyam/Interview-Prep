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


/* ----------------------------- capture a job or profile page ----------------------------- */

const APP_PATTERNS = ["http://localhost/*", "http://127.0.0.1/*", "https://*.vercel.app/*"];
const QUEUE_KEY = "captures";
const CONFIG_KEY = "apiConfig";
const MAX_QUEUE = 20;

/**
 * Runs inside the page you are looking at (only after you click the toolbar icon, via activeTab).
 * Self-contained: it can't use anything from this file. Returns plain data or { kind: "none" }.
 */
function extractPage() {
  const clip = (s, n) => String(s || "").replace(/\u0000/g, "").trim().slice(0, n);
  const plain = (html) => {
    const withBreaks = String(html || "")
      .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\u2022 ");
    let text = "";
    try {
      const doc = new DOMParser().parseFromString(withBreaks, "text/html");
      doc.querySelectorAll("script,style").forEach((el) => el.remove());
      text = doc.body.textContent || "";
    } catch {
      // fall through to the regex below
    }
    if (!text.trim()) text = withBreaks.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");
    return text.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  };
  const href = location.href;
  const host = location.hostname;

  // A profile page of your own on a job network: send its text so PrepOS can audit it.
  const isProfile = /linkedin\.com\/in\//.test(href) || /naukri\.com\/mnjuser\/profile/.test(href) || /wellfound\.com\/(u|profile)\//.test(href);
  if (isProfile) {
    const main = document.querySelector("main") || document.body;
    return { kind: "profile", title: clip(document.title, 200), url: href, text: clip(main.innerText, 30000) };
  }

  // Most boards embed schema.org JobPosting data for search engines: use it first.
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    let json;
    try {
      json = JSON.parse(s.textContent);
    } catch {
      continue;
    }
    const items = Array.isArray(json) ? json : json && json["@graph"] ? json["@graph"] : [json];
    for (const it of items) {
      const type = it && it["@type"];
      if (!(type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting")))) continue;
      const org = it.hiringOrganization;
      const loc = Array.isArray(it.jobLocation) ? it.jobLocation[0] : it.jobLocation;
      const addr = loc && loc.address;
      const place = addr && typeof addr === "object" ? [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter((x) => typeof x === "string").join(", ") : "";
      return {
        kind: "job",
        title: clip(it.title, 200),
        company: clip(typeof org === "string" ? org : org && org.name, 160),
        location: clip(place, 160),
        url: href,
        jd: clip(plain(it.description), 20000),
      };
    }
  }

  // Fallback: the page's own headings and description blocks. Selectors are best effort and change.
  const pick = (sels) => {
    for (const q of sels) {
      const el = document.querySelector(q);
      if (el && el.innerText && el.innerText.trim().length > 1) return el.innerText.trim();
    }
    return "";
  };
  const title = pick(["h1.top-card-layout__title", ".job-details-jobs-unified-top-card__job-title", "h1[class*='jd-header-title']", "h1[class*='JobTitle']", "h1"]);
  const company = pick([".topcard__org-name-link", ".job-details-jobs-unified-top-card__company-name", "a[class*='jd-header-comp-name']", "[data-testid='inlineHeader-companyName']", "[class*='companyName']", "[class*='company-name']", "a[href*='/company/']"]);
  const jd = pick([".show-more-less-html__markup", ".jobs-description__content", "#jobDescriptionText", "[class*='job-desc']", "[class*='JobDescription']", "[class*='description']", "main", "article"]);
  if (!title || !company || jd.length < 80) return { kind: "none", host };
  return { kind: "job", title: clip(title, 200), company: clip(company, 160), location: "", url: href, jd: clip(jd, 20000) };
}

async function readQueue() {
  const got = await chrome.storage.local.get(QUEUE_KEY);
  return Array.isArray(got[QUEUE_KEY]) ? got[QUEUE_KEY] : [];
}
const writeQueue = (list) => chrome.storage.local.set({ [QUEUE_KEY]: list.slice(-MAX_QUEUE) });

async function flash(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 4000);
}

/**
 * Sends one queued capture straight to the PrepOS API with the token from the options page. Returns "sent" (stored, or
 * already stored: the Idempotency-Key makes a retry safe), "auth" (the token is wrong or expired: the user must fix it)
 * or "later" (offline or a server error: keep it queued). Nothing is sent anywhere else.
 */
async function sendViaApi(entry) {
  const got = await chrome.storage.local.get(CONFIG_KEY);
  const cfg = got[CONFIG_KEY];
  if (!cfg || !cfg.base || !cfg.token) return "none";
  const p = entry.payload;
  const isProfile = p.kind === "profile";
  const body = isProfile ? { title: p.title, url: p.url, text: p.text } : { title: p.title, company: p.company, url: p.url, location: p.location || undefined, jd: p.jd || "" };
  try {
    const res = await fetch(`${cfg.base}/api/v1/${isProfile ? "profiles" : "jobs"}`, {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json", "idempotency-key": entry.id },
      body: JSON.stringify(body),
    });
    if (res.ok) return "sent";
    if (res.status === 401 || res.status === 403) return "auth";
    if (res.status === 422 || res.status === 413) return "sent"; // PrepOS refused the content itself: retrying cannot help, so drop it
    return "later";
  } catch {
    return "later";
  }
}

/** Tries every queued capture through the API. Returns how many were delivered and whether the token was refused. */
async function flushViaApi() {
  let sent = 0;
  let auth = false;
  for (const entry of await readQueue()) {
    const r = await sendViaApi(entry);
    if (r === "none") return { sent, auth, configured: false };
    if (r === "auth") {
      auth = true;
      break;
    }
    if (r === "sent") {
      await writeQueue((await readQueue()).filter((c) => c.id !== entry.id));
      sent++;
    }
  }
  return { sent, auth, configured: true };
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || "")) return flash("!", "#b45309");
  let payload;
  try {
    const [out] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPage });
    payload = out && out.result;
  } catch {
    return flash("!", "#b45309");
  }
  if (!payload || payload.kind === "none") return flash("?", "#b45309");

  const entry = { id: crypto.randomUUID(), payload };
  await writeQueue([...(await readQueue()), entry]);
  // With an API token set up, deliver without needing a PrepOS tab at all.
  const viaApi = await flushViaApi();
  if (viaApi.configured) {
    if (viaApi.auth) return flash("!", "#b45309");
    if ((await readQueue()).every((c) => c.id !== entry.id)) return flash("\u2713", "#16a34a");
  }
  // Otherwise (or if the API could not take it right now) hand it to an open PrepOS tab; if there is none it stays queued until one opens and asks for it.
  const apps = await chrome.tabs.query({ url: APP_PATTERNS });
  let delivered = false;
  for (const t of apps) {
    try {
      await chrome.tabs.sendMessage(t.id, { type: "capture", id: entry.id, payload });
      delivered = true;
    } catch {
      // That tab isn't PrepOS (or hasn't loaded the content script): try the next.
    }
  }
  flash(delivered ? "\u2713" : "1", delivered ? "#16a34a" : "#2563eb");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab) return false;
  if (msg?.type === "drain") {
    readQueue().then(sendResponse, () => sendResponse([]));
    return true;
  }
  if (msg?.type === "ack" && typeof msg.id === "string") {
    readQueue()
      .then((list) => writeQueue(list.filter((c) => c.id !== msg.id)))
      .then(() => sendResponse(true), () => sendResponse(false));
    return true;
  }
  return false;
});
