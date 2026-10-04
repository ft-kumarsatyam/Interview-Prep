/**
 * Finds which public job-board API each company uses, by trying its likely slugs on every board.
 *   node scripts/careers-discover.mjs candidates.txt > found.json
 * candidates.txt: one company per line, `Name` or `Name | slug1,slug2`. Prints JSON entries for companies
 * that returned open jobs (count included), and a summary of misses on stderr. Needs network. Read-only.
 */
import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; PrepOS/1.0; careers-discover)";
const T = 20_000;
const get = async (url) => {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(T) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

const probes = {
  greenhouse: async (s) => (await get(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`))?.jobs?.length ?? 0,
  lever: async (s) => {
    const r = await get(`https://api.lever.co/v0/postings/${s}?mode=json&limit=200`);
    return Array.isArray(r) ? r.length : 0;
  },
  ashby: async (s) => (await get(`https://api.ashbyhq.com/posting-api/job-board/${s}`))?.jobs?.length ?? 0,
  workable: async (s) => (await get(`https://apply.workable.com/api/v1/widget/accounts/${s}`))?.jobs?.length ?? 0,
  smartrecruiters: async (s) => (await get(`https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=1`))?.totalFound ?? 0,
};

const slugsFor = (name) => {
  const base = name.toLowerCase().replace(/&/g, "and").replace(/\.com$/, "");
  const squashed = base.replace(/[^a-z0-9]+/g, "");
  const dashed = base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const first = base.split(/[^a-z0-9]+/)[0];
  return [...new Set([squashed, dashed, first])].filter((s) => s.length >= 2);
};

const lines = readFileSync(process.argv[2], "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const found = [];
const missed = [];
let next = 0;

async function worker() {
  while (next < lines.length) {
    const line = lines[next++];
    const [name, custom] = line.split("|").map((x) => x.trim());
    const slugs = custom ? custom.split(",").map((s) => s.trim()) : slugsFor(name);
    let best = null;
    for (const slug of slugs) {
      for (const [ats, probe] of Object.entries(probes)) {
        const count = await probe(slug);
        if (count > 0 && (!best || count > best.count)) best = { name, ats, slug, count };
      }
      if (best) break;
    }
    if (best) found.push(best);
    else missed.push(name);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
found.sort((a, b) => a.name.localeCompare(b.name));
console.log(JSON.stringify(found, null, 1));
console.error(`found ${found.length}/${lines.length}; no public board for: ${missed.sort().join(", ")}`);
