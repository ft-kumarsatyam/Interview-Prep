/**
 * Checks that every board in data/careers.json still returns open jobs. Run it now and then (or from the
 * weekly workflow): companies change applicant-tracking systems and slugs go dead.
 *   npm run careers:verify
 * Exits 1 when any board is dead so a workflow can flag it. Needs network. Read-only.
 */
import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; PrepOS/1.0; careers-verify)";
const url = {
  greenhouse: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
  lever: (s) => `https://api.lever.co/v0/postings/${s}?mode=json&limit=50`,
  ashby: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`,
  workable: (s) => `https://apply.workable.com/api/v1/widget/accounts/${s}`,
  smartrecruiters: (s) => `https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=1`,
};
const count = (ats, j) => (ats === "greenhouse" ? j?.jobs?.length : ats === "lever" ? (Array.isArray(j) ? j.length : 0) : ats === "ashby" || ats === "workable" ? j?.jobs?.length : j?.totalFound) ?? 0;

const { sources } = JSON.parse(readFileSync(new URL("../data/careers.json", import.meta.url), "utf8"));
const dead = [];
let next = 0;
async function worker() {
  while (next < sources.length) {
    const s = sources[next++];
    let n = 0;
    let why = "";
    try {
      const res = await fetch(url[s.ats](s.slug), { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
      if (!res.ok) why = `HTTP ${res.status}`;
      else n = count(s.ats, await res.json());
    } catch (e) {
      why = e instanceof Error ? e.message : String(e);
    }
    if (n === 0) dead.push(`${s.name} (${s.ats}/${s.slug}): ${why || "no open jobs"}`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`${sources.length - dead.length}/${sources.length} boards OK`);
if (dead.length) {
  console.log("Dead or empty:\n- " + dead.sort().join("\n- "));
  process.exit(1);
}
