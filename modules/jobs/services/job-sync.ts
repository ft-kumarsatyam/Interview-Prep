import { randomUUID } from "node:crypto";
import { careerSources } from "@/core/content";
import { connectDb } from "@/core/db";
import { termsIn } from "@/modules/jobs/domain/ats";
import { requiredYears } from "@/modules/jobs/domain/job-profile";
import { AGGREGATORS, postingKey, type Aggregator, type CareerSource, type NormalizedPosting } from "@/modules/jobs/domain/job-postings";
import { dueSources, MAX_POSTINGS_TOTAL, nextHealth, selectPostings, START_NEW_UNTIL_LEFT_MS } from "@/modules/jobs/domain/job-sync";
import { bumpVersion } from "@/core/cache";
import { logger } from "@/core/observability/log";
import { getKv } from "@/core/kv";
import { defaultFetcher, defaultTextFetcher, fetchAggregator, fetchBoard, fetchCareerPage, isAggregator, type Fetcher, type SourceResult } from "@/modules/jobs/lib/connectors";
import { JobPosting, JobSource } from "@/core/models/job-postings";
import { pLimit } from "@/core/http";
import { publish } from "@/core/realtime";

const LOCK_KEY = "lock:jobsync";
const LOCK_TTL_SEC = 120;
const CONCURRENCY = 6;
/** Aggregators beyond remote-first ones are opt-in: Arbeitnow lists mostly European roles. */
const DEFAULT_OFF: readonly string[] = ["arbeitnow"];

export interface SyncSummary {
  status: "done" | "skipped";
  reason?: "already running";
  sources: number;
  ok: number;
  unchanged: number;
  failed: Array<{ id: string; error: string }>;
  added: number;
  closed: number;
  remaining: number;
}

export interface SyncOptions {
  now?: Date;
  fetcher?: Fetcher;
  /** Total time this run may take; new sources stop starting near the end. */
  budgetMs?: number;
  /** Only these source ids (used by "refresh this company"). */
  only?: string[];
  /** Tell open tabs about progress and new jobs (default on; tests turn it off). */
  live?: boolean;
  /** Ignore the minimum gap between runs of a source (the Refresh button). */
  force?: boolean;
  onProgress?: (done: number, total: number, source: string) => void;
}

/** Makes sure every built-in source and aggregator has a row, keeping your on/off choices and each source's health. */
export async function ensureSources(): Promise<void> {
  await connectDb();
  const ops = [
    ...careerSources.map((s) => ({ updateOne: { filter: { _id: s.id }, update: { $set: { name: s.name, kind: "board" as const, ats: s.ats, slug: s.slug, tier: s.tier, companyId: s.companyId ?? null }, $setOnInsert: { custom: false, enabled: true } }, upsert: true } })),
    ...AGGREGATORS.map((a) => ({ updateOne: { filter: { _id: a }, update: { $set: { name: a, kind: "aggregator" as const, ats: a, slug: "" }, $setOnInsert: { custom: false, enabled: !DEFAULT_OFF.includes(a) } }, upsert: true } })),
  ];
  await JobSource.bulkWrite(ops, { ordered: false });
}

type SourceDoc = { _id: string; name: string; url?: string; kind: "board" | "aggregator" | "scrape" | "push"; ats: string; slug: string; tier: string; companyId: string | null; enabled: boolean; lastTriedAt: Date | null; cooldownUntil: Date | null; consecutiveFailures: number; etag: string };

async function fetchSource(doc: SourceDoc, fetcher: Fetcher, textFetcher: Fetcher = defaultTextFetcher): Promise<SourceResult> {
  if (doc.kind === "scrape") return fetchCareerPage({ id: doc._id, name: doc.name, url: doc.url ?? "" }, textFetcher);
  if (doc.kind === "push") throw new Error("Pushed sources are not fetched");
  if (doc.kind === "aggregator") {
    if (!isAggregator(doc.ats)) throw new Error("Unknown aggregator");
    return fetchAggregator(doc.ats as Aggregator, fetcher, doc.etag);
  }
  const src: CareerSource = { id: doc._id, name: doc.name, tier: doc.tier, ats: doc.ats as CareerSource["ats"], slug: doc.slug, ...(doc.companyId ? { companyId: doc.companyId } : {}) };
  return fetchBoard(src, fetcher, doc.etag);
}

/** Writes one source's postings: new ones are inserted, seen ones refreshed, vanished ones closed. */
export async function storePostings(doc: Pick<SourceDoc, "_id" | "tier" | "companyId">, postings: NormalizedPosting[], now: Date, opts: { closeMissing?: boolean } = {}): Promise<{ added: number; closed: number }> {
  const ops = postings.map((p) => ({
    updateOne: {
      filter: { key: postingKey(p) },
      update: {
        $set: {
          source: p.source, sourceId: p.sourceId, externalId: p.externalId, title: p.title, company: p.company, tier: doc.tier, companyId: doc.companyId, location: p.location, remote: p.remote, department: p.department,
          postedAt: p.postedAt ? new Date(p.postedAt) : null, url: p.url, applyUrl: p.applyUrl, tags: p.tags, lastSeenAt: now, closedAt: null,
          // A list endpoint without descriptions (SmartRecruiters) must not wipe one fetched earlier.
          ...(p.jd ? { jd: p.jd, terms: termsIn(`${p.title}\n${p.jd}`), yearsMin: requiredYears(`${p.title}\n${p.jd}`) } : {}),
        },
        $setOnInsert: { firstSeenAt: now, dismissed: false, alerted: false, savedJobId: null, ...(p.jd ? {} : { jd: "", terms: termsIn(p.title), yearsMin: requiredYears(p.title) }) },
      },
      upsert: true,
    },
  }));
  const res = ops.length ? await JobPosting.bulkWrite(ops, { ordered: false }) : { upsertedCount: 0 };
  // Anything from this source that was open before this run and was not in the response is gone.
  // A pushed source only ever adds: absence from one request says nothing about the others.
  const closed = opts.closeMissing === false ? { modifiedCount: 0 } : await JobPosting.updateMany({ sourceId: doc._id, closedAt: null, lastSeenAt: { $lt: now } }, { $set: { closedAt: now } });
  return { added: res.upsertedCount, closed: closed.modifiedCount };
}

/** Keeps the feed under its cap by dropping closed postings first, then the ones seen longest ago. */
export async function trimPostings(max = MAX_POSTINGS_TOTAL): Promise<number> {
  await connectDb();
  const total = await JobPosting.estimatedDocumentCount();
  if (total <= max) return 0;
  const excess = total - max;
  const victims = await JobPosting.find({ savedJobId: null }).sort({ closedAt: -1, lastSeenAt: 1 }).limit(excess).select("_id").lean();
  // closedAt: -1 puts open ones (null) last in Mongo's ordering, so closed rows go first.
  const res = await JobPosting.deleteMany({ _id: { $in: victims.map((v) => v._id) } });
  return res.deletedCount;
}

/**
 * Pulls postings from every source that is due. Safe to run twice at once (a lock), safe to run any time
 * (each source has a minimum gap), and one broken company never stops the others (each is isolated, with
 * its own backoff). Descriptions are cut to 8 KB and only engineering roles are kept.
 */
export async function syncJobs(opts: SyncOptions = {}): Promise<SyncSummary> {
  const now = opts.now ?? new Date();
  const fetcher = opts.fetcher ?? defaultFetcher;
  const budget = opts.budgetMs ?? 50_000;
  const started = Date.now();
  const kv = getKv();
  const token = randomUUID();
  if (!(await kv.setNx(LOCK_KEY, token, LOCK_TTL_SEC))) return { status: "skipped", reason: "already running", sources: 0, ok: 0, unchanged: 0, failed: [], added: 0, closed: 0, remaining: 0 };

  try {
    await ensureSources();
    const docs = ((await JobSource.find({}).lean()) as unknown as SourceDoc[]).filter((d) => d.kind !== "push");
    const pool = opts.only ? docs.filter((d) => opts.only!.includes(d._id)) : docs;
    const due = dueSources(pool.map((d) => ({ ...d, id: d._id, lastTriedAt: d.lastTriedAt ?? null, cooldownUntil: d.cooldownUntil ?? null })), opts.force ? new Date(now.getTime() + 365 * 86_400_000) : now);
    const queue = [...due];
    const summary: SyncSummary = { status: "done", sources: 0, ok: 0, unchanged: 0, failed: [], added: 0, closed: 0, remaining: 0 };
    const limit = pLimit(CONCURRENCY);
    let done = 0;

    await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        limit(async () => {
          for (;;) {
            if (budget - (Date.now() - started) < START_NEW_UNTIL_LEFT_MS) return;
            const doc = queue.shift();
            if (!doc) return;
            summary.sources++;
            try {
              const res = await fetchSource(doc, fetcher, opts.fetcher ?? defaultTextFetcher);
              if (res.status === "unchanged") {
                summary.unchanged++;
                await JobSource.updateOne({ _id: doc._id }, { $set: { lastTriedAt: now, lastOkAt: now, ...nextHealth(doc, { ok: true }, now) } });
              } else {
                const kept = selectPostings(res.postings);
                const { added, closed } = await storePostings(doc, kept, now);
                summary.ok++;
                summary.added += added;
                summary.closed += closed;
                await JobSource.updateOne({ _id: doc._id }, { $set: { lastTriedAt: now, lastOkAt: now, lastCount: kept.length, etag: res.etag, ...nextHealth(doc, { ok: true }, now) } });
              }
            } catch (err) {
              const error = err instanceof Error ? err.message : String(err);
              summary.failed.push({ id: doc._id, error });
              await JobSource.updateOne({ _id: doc._id }, { $set: { lastTriedAt: now, ...nextHealth(doc, { ok: false, error }, now) } });
            }
            done++;
            opts.onProgress?.(done, due.length, doc._id);
            // Tell open tabs how far along it is, but not after every single source.
            if (opts.live !== false && (done % 10 === 0 || done === due.length)) void publish({ type: "sync.progress", done, total: due.length });
          }
        }),
      ),
    );
    summary.remaining = queue.length;
    await trimPostings();
    if (summary.added > 0 || summary.closed > 0 || summary.ok > 0) await bumpVersion("jobs");
    // One structured line per run, with an id to follow it by. Counts and source ids only: never page or description text.
    logger({ runId: token.slice(0, 8), module: "job-sync" }).info({ sources: summary.sources, ok: summary.ok, unchanged: summary.unchanged, failed: summary.failed.map((f) => f.id), added: summary.added, closed: summary.closed, remaining: summary.remaining, ms: Date.now() - started }, "job sync finished");
    if (opts.live !== false) {
      await publish({ type: "sync.done", ok: summary.ok + summary.unchanged, failed: summary.failed.length, added: summary.added });
      if (summary.added > 0) await publish({ type: "jobs.new", count: summary.added });
    }
    return summary;
  } finally {
    await kv.releaseIfOwner(LOCK_KEY, token);
  }
}
