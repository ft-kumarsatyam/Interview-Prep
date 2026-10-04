// Options page: the PrepOS address and API token. Plain JS, no dependencies.
const KEY = "apiConfig";
const $ = (id) => document.getElementById(id);
const say = (text, ok) => {
  const el = $("msg");
  el.textContent = text;
  el.className = ok === undefined ? "" : ok ? "ok" : "bad";
};

/** https anywhere, or http only for localhost, so a token never travels in clear text over the internet. */
function parseBase(raw) {
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (!(u.protocol === "https:" || (u.protocol === "http:" && local))) return null;
  return u.origin;
}

async function load() {
  const got = await chrome.storage.local.get(KEY);
  if (got[KEY]) {
    $("base").value = got[KEY].base || "";
    $("token").value = got[KEY].token || "";
  }
}

async function save() {
  const base = parseBase($("base").value);
  const token = $("token").value.trim();
  if (!base) return say("Use an https address (or http://localhost).", false);
  if (!/^pk_[a-z0-9]{8}_[a-z0-9]{32}$/.test(token)) return say("That doesn't look like a PrepOS token (pk_xxxxxxxx_…).", false);
  const granted = await chrome.permissions.request({ origins: [`${base}/*`] });
  if (!granted) return say("Chrome needs your permission to let the extension talk to that address.", false);
  await chrome.storage.local.set({ [KEY]: { base, token } });
  say("Saved.", true);
}

async function test() {
  const got = await chrome.storage.local.get(KEY);
  const cfg = got[KEY];
  if (!cfg) return say("Save first.", false);
  try {
    const res = await fetch(`${cfg.base}/api/v1/jobs`, { headers: { authorization: `Bearer ${cfg.token}` } });
    if (res.ok) return say("Connected. (The token can read your jobs.)", true);
    if (res.status === 403) return say("Connected. The token works, but it has no read scope; capturing needs only capture:write.", true);
    if (res.status === 401) return say("PrepOS rejected the token: it may be expired or revoked.", false);
    say(`PrepOS answered HTTP ${res.status}.`, false);
  } catch {
    say("Couldn't reach that address.", false);
  }
}

async function clear() {
  await chrome.storage.local.remove(KEY);
  $("base").value = "";
  $("token").value = "";
  say("Removed. The extension will use an open PrepOS tab again.", true);
}

$("save").addEventListener("click", save);
$("test").addEventListener("click", test);
$("clear").addEventListener("click", clear);
load();
