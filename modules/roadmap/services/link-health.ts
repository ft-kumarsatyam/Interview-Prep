import { connectDb } from "@/core/db";
import { fetchSafe } from "@/core/http-safe";
import { LinkHealth } from "@/core/models/link-health";
import { loadAllRoadmaps } from "@/core/roadmaps";
import { allNodes } from "@/modules/roadmap/domain/roadmap";
import { checkUrlFor, classify, nextEntry, pickBatch, type LinkState } from "@/modules/roadmap/domain/link-health";

const BATCH = 40;
const CONCURRENCY = 4;

const allUrls = async (): Promise<string[]> => [...new Set((await loadAllRoadmaps()).flatMap((r) => allNodes(r).flatMap((n) => n.links.map((l) => l.url))))];

/** One GET with the SSRF checks, a small body cap and a short timeout. Returns the HTTP status, or null when the request failed. */
async function probe(url: string): Promise<number | null> {
  try {
    const res = await fetchSafe(checkUrlFor(url), { timeoutMs: 8_000, maxBytes: 20_000 });
    return res.status;
  } catch (e) {
    const m = /^HTTP (\d{3})/.exec(e instanceof Error ? e.message : "");
    return m ? Number(m[1]) : null;
  }
}

export interface LinkCheckResult {
  checked: number;
  dead: number;
  blocked: number;
  remaining: number;
}

/** Checks the next batch of roadmap links and stores the outcome. Safe to call often: it only touches the stalest links. */
export async function runLinkCheck(now = new Date()): Promise<LinkCheckResult> {
  await connectDb();
  const urls = await allUrls();
  const rows = await LinkHealth.find({ url: { $in: urls } }, { url: 1, status: 1, failures: 1, checkedAt: 1 }).lean();
  const known = new Map(rows.map((r) => [r.url, r]));
  const batch = pickBatch(urls, known, BATCH);
  const outcomes: Array<{ url: string; state: LinkState; httpStatus: number | null }> = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < batch.length) {
        const url = batch[cursor++]!;
        const httpStatus = await probe(url);
        outcomes.push({ url, state: classify(httpStatus), httpStatus });
      }
    }),
  );
  if (outcomes.length) {
    await LinkHealth.bulkWrite(
      outcomes.map((o) => ({
        updateOne: {
          filter: { url: o.url },
          update: { $set: { ...nextEntry(known.get(o.url), o.state), httpStatus: o.httpStatus, checkedAt: now } },
          upsert: true,
        },
      })),
    );
  }
  const states = outcomes.map((o) => nextEntry(known.get(o.url), o.state).status);
  return { checked: outcomes.length, dead: states.filter((s) => s === "dead").length, blocked: states.filter((s) => s === "blocked").length, remaining: Math.max(0, urls.length - batch.length) };
}

/** The urls that are confirmed dead, for the badge on a link. Empty until the first check has run. */
export async function getDeadLinks(urls: readonly string[]): Promise<ReadonlySet<string>> {
  await connectDb();
  const rows = await LinkHealth.find({ url: { $in: [...urls] }, status: "dead" }, { url: 1 }).lean();
  return new Set(rows.map((r) => r.url));
}
