import { createHash } from "node:crypto";
import { bumpVersion, readThrough } from "@/core/cache";
import { stableName } from "@/core/domain/cache";
import { connectDb } from "@/core/db";
import { termsIn } from "@/modules/jobs/domain/ats";
import type { DateStr } from "@/core/domain/dates";
import { matchProfile } from "@/modules/jobs/domain/job-profile";
import { getProfile } from "@/modules/jobs/services/job-profiles";
import { DEFAULT_PREFS, jobPrefsSchema, matchPosting, type JobPrefs, type Match } from "@/modules/jobs/domain/job-match";
import { BOARD_ATS, detectBoard, postingKey, type BoardAts } from "@/modules/jobs/domain/job-postings";
import { healthLabel, selectPostings, type HealthLabel } from "@/modules/jobs/domain/job-sync";
import { JobPosting, JobPrefsDoc, JobSource } from "@/core/models/job-postings";
import { fetchCareerPage, fetchSmartRecruitersDescription, probeBoard, type Fetcher } from "@/modules/jobs/lib/connectors";
import { isPublicCareerUrl } from "@/modules/jobs/domain/job-push";
import { addJob, getJob, setJobStatus } from "@/modules/jobs/services/jobs";
import { syncJobs, type SyncSummary } from "@/modules/jobs/services/job-sync";
import { getBaseResume } from "@/modules/resume/services/resume";
import { listTargets } from "@/modules/targets/services/targets";

/* ----------------------------------- preferences ----------------------------------- */

export async function getJobPrefs(): Promise<JobPrefs> {
  await connectDb();
  const doc = await JobPrefsDoc.findById("prefs").lean();
  const parsed = jobPrefsSchema.safeParse(doc?.data ?? {});
  return parsed.success ? parsed.data : DEFAULT_PREFS;
}

export async function saveJobPrefs(input: unknown): Promise<JobPrefs> {
  const prefs = jobPrefsSchema.parse(input);
  await connectDb();
  await JobPrefsDoc.updateOne({ _id: "prefs" }, { $set: { data: prefs } }, { upsert: true });
  await bumpVersion("jobs");
  return prefs;
}

/* ------------------------------------ discovering ------------------------------------ */

export interface DiscoverFilter {
  q?: string;
  kind?: "all" | "boards" | "remote";
  tier?: string;
  remote?: boolean;
  /** Only roles posted (or first seen) in the last N days. */
  days?: number;
  /** Minimum match score. */
  min?: number;
  sourceId?: string;
  /** Score and filter with this saved profile instead of your general preferences. */
  profileId?: string;
  showDismissed?: boolean;
  limit?: number;
}

export interface DiscoverItem {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean | null;
  source: string;
  sourceId: string;
  tier: string;
  department: string;
  postedAt: string | null;
  firstSeenAt: string;
  isNew: boolean;
  dismissed: boolean;
  savedJobId: string | null;
  score: number;
  reasons: string[];
  matched: string[];
  missing: string[];
}

const NEW_HOURS = 36;
const SCAN_LIMIT = 800;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What the scorer needs from you: preferences, the skills your resume mentions, and the companies you target. */
export async function matchContext(now: Date) {
  const [prefs, base, targets] = await Promise.all([getJobPrefs(), getBaseResume(), listTargets()]);
  return { prefs, resumeTerms: base ? new Set(termsIn(base.text)) : null, targetNames: targets.map((t) => t.name), now, hasResume: Boolean(base) };
}

export type DiscoverResult = { items: DiscoverItem[]; matching: number; scanned: number; hasPrefs: boolean; hasResume: boolean };

/**
 * The scored Discover list, cached per filter (versioned scope "jobs": a sync, a dismiss, a save, new preferences or a
 * new resume bump it). Passing `now` explicitly (tests) skips the cache so the clock stays under the caller's control.
 */
export async function discoverJobs(filter: DiscoverFilter = {}, now?: Date): Promise<DiscoverResult> {
  if (now) return computeDiscover(filter, now);
  return readThrough("jobs", `discover:${stableName({ ...filter })}`, () => computeDiscover(filter, new Date()), { ttlSec: 120, staleSec: 600 });
}

async function computeDiscover(filter: DiscoverFilter, now: Date): Promise<DiscoverResult> {
  await connectDb();
  const ctx = await matchContext(now);
  const profile = filter.profileId ? await getProfile(filter.profileId) : null;
  if (profile) ctx.prefs = profile;
  const where: Record<string, unknown> = { closedAt: null };
  if (!filter.showDismissed) where.dismissed = false;
  if (filter.sourceId) where.sourceId = filter.sourceId;
  else if (filter.kind === "boards") where.source = { $in: BOARD_ATS };
  else if (filter.kind === "remote") where.source = { $nin: BOARD_ATS };
  if (filter.tier) where.tier = filter.tier;
  if (filter.remote) where.remote = true;
  if (filter.q?.trim()) {
    const re = new RegExp(escapeRe(filter.q.trim().slice(0, 60)), "i");
    where.$or = [{ title: re }, { company: re }];
  }
  if (filter.days) {
    const since = new Date(now.getTime() - filter.days * 86_400_000);
    where.$and = [{ $or: [{ postedAt: { $gte: since } }, { postedAt: null, firstSeenAt: { $gte: since } }] }];
  }

  const rows = await JobPosting.find(where, { jd: 0 }).sort({ postedAt: -1, firstSeenAt: -1 }).limit(SCAN_LIMIT).lean();
  const scored = rows
    .map((r) => {
      const scorable = { title: r.title, company: r.company, location: r.location ?? "", remote: r.remote ?? null, postedAt: r.postedAt ?? null, tier: r.tier ?? "", terms: r.terms ?? [], department: r.department ?? "", yearsMin: r.yearsMin ?? null };
      const m: Match = profile ? matchProfile(scorable, ctx, profile) : matchPosting(scorable, ctx);
      return { r, m };
    })
    .filter(({ m }) => !m.excluded && m.score >= (filter.min ?? 0));
  scored.sort((a, b) => b.m.score - a.m.score || (b.r.postedAt?.getTime() ?? 0) - (a.r.postedAt?.getTime() ?? 0));

  const items: DiscoverItem[] = scored.slice(0, filter.limit ?? 60).map(({ r, m }) => ({
    id: String(r._id),
    title: r.title,
    company: r.company,
    location: r.location ?? "",
    remote: r.remote ?? null,
    source: r.source,
    sourceId: r.sourceId,
    tier: r.tier ?? "",
    department: r.department ?? "",
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
    firstSeenAt: r.firstSeenAt.toISOString(),
    isNew: now.getTime() - r.firstSeenAt.getTime() < NEW_HOURS * 3_600_000,
    dismissed: Boolean(r.dismissed),
    savedJobId: r.savedJobId ? String(r.savedJobId) : null,
    score: m.score,
    reasons: m.reasons,
    matched: m.matched,
    missing: m.missing,
  }));
  return { items, matching: scored.length, scanned: rows.length, hasPrefs: ctx.prefs.roles.length > 0, hasResume: ctx.hasResume };
}

export interface PostingDetail extends Omit<DiscoverItem, "isNew"> {
  jd: string;
  applyUrl: string;
  url: string;
  descriptionUnavailable: boolean;
}

/** One posting with its full description. SmartRecruiters descriptions are fetched the first time you open one. */
export async function getPostingDetail(id: string, now = new Date(), fetcher?: Fetcher): Promise<PostingDetail | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDb();
  const r = await JobPosting.findById(id).lean();
  if (!r) return null;
  let jd = r.jd ?? "";
  let unavailable = false;
  if (!jd && r.source === "smartrecruiters") {
    const src = await JobSource.findById(r.sourceId).lean();
    try {
      jd = await fetchSmartRecruitersDescription(src?.slug || r.sourceId, r.externalId, fetcher);
      await JobPosting.updateOne({ _id: r._id }, { $set: { jd, terms: termsIn(`${r.title}\n${jd}`) } });
    } catch {
      unavailable = true;
    }
  }
  const terms = jd ? termsIn(`${r.title}\n${jd}`) : (r.terms ?? []);
  const ctx = await matchContext(now);
  const m = matchPosting({ title: r.title, company: r.company, location: r.location ?? "", remote: r.remote ?? null, postedAt: r.postedAt ?? null, tier: r.tier ?? "", terms }, ctx);
  return {
    id: String(r._id), title: r.title, company: r.company, location: r.location ?? "", remote: r.remote ?? null, source: r.source, sourceId: r.sourceId, tier: r.tier ?? "", department: r.department ?? "",
    postedAt: r.postedAt ? r.postedAt.toISOString() : null, firstSeenAt: r.firstSeenAt.toISOString(), dismissed: Boolean(r.dismissed), savedJobId: r.savedJobId ? String(r.savedJobId) : null,
    score: m.score, reasons: m.reasons, matched: m.matched, missing: m.missing, jd, applyUrl: r.applyUrl, url: r.url, descriptionUnavailable: unavailable || !jd,
  };
}

export async function setDismissed(id: string, dismissed: boolean): Promise<void> {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error("Unknown job");
  await connectDb();
  await JobPosting.updateOne({ _id: id }, { $set: { dismissed } });
  await bumpVersion("jobs");
}

export type SaveResult = { ok: true; jobId: string; duplicate: boolean } | { ok: false; error: string };

/** Copies a discovered posting into your tracker (once) and remembers the link. */
export async function savePosting(id: string, today: DateStr): Promise<SaveResult> {
  const d = await getPostingDetail(id);
  if (!d) return { ok: false, error: "That job is no longer listed" };
  if (d.savedJobId && (await getJob(d.savedJobId))) return { ok: true, jobId: d.savedJobId, duplicate: true };
  const res = await addJob({ title: d.title, company: d.company, url: d.url, applyUrl: d.applyUrl, location: d.location.slice(0, 160) || undefined, jd: d.jd }, today);
  if (!res.ok) return res;
  await JobPosting.updateOne({ _id: id }, { $set: { savedJobId: res.job.id } });
  await bumpVersion("jobs");
  return { ok: true, jobId: res.job.id, duplicate: res.duplicate };
}

/** Saves the posting if needed and marks it applied (sets the date and the follow-up). */
export async function markPostingApplied(id: string, today: DateStr): Promise<SaveResult> {
  const saved = await savePosting(id, today);
  if (!saved.ok) return saved;
  await setJobStatus(saved.jobId, "applied", today);
  return saved;
}

/* ------------------------------------- sources ------------------------------------- */

export interface SourceRow {
  id: string;
  name: string;
  kind: "board" | "aggregator" | "scrape" | "push";
  ats: string;
  tier: string;
  custom: boolean;
  enabled: boolean;
  open: number;
  lastOkAt: string | null;
  lastError: string;
  health: HealthLabel;
}

export async function listSources(now = new Date()): Promise<SourceRow[]> {
  await connectDb();
  const [docs, counts] = await Promise.all([JobSource.find({}).sort({ name: 1 }).lean(), JobPosting.aggregate<{ _id: string; n: number }>([{ $match: { closedAt: null } }, { $group: { _id: "$sourceId", n: { $sum: 1 } } }])]);
  const open = new Map(counts.map((c) => [c._id, c.n]));
  return docs.map((d) => ({
    id: d._id, name: d.name, kind: d.kind as SourceRow["kind"], ats: d.ats, tier: d.tier ?? "", custom: Boolean(d.custom), enabled: Boolean(d.enabled), open: open.get(d._id) ?? 0,
    lastOkAt: d.lastOkAt ? d.lastOkAt.toISOString() : null, lastError: d.lastError ?? "",
    health: healthLabel({ id: d._id, kind: d.kind as SourceRow["kind"], enabled: Boolean(d.enabled), lastTriedAt: d.lastTriedAt ?? null, cooldownUntil: d.cooldownUntil ?? null, consecutiveFailures: d.consecutiveFailures ?? 0, lastOkAt: d.lastOkAt ?? null }, now),
  }));
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<void> {
  await connectDb();
  const res = await JobSource.updateOne({ _id: id }, { $set: { enabled, ...(enabled ? { cooldownUntil: null, consecutiveFailures: 0 } : {}) } });
  await bumpVersion("jobs");
  if (res.matchedCount === 0) throw new Error("Unknown source");
}

export const MAX_CUSTOM_SOURCES = 40;

/** Adds a company by the URL of its job board. The board is probed first, so a wrong link never gets saved. */
export async function addCustomSource(rawUrl: string, tier: string, fetcher?: Fetcher): Promise<{ ok: true; id: string; name: string; count: number } | { ok: false; error: string }> {
  const board = detectBoard(rawUrl);
  if (!board) return addCareerPage(rawUrl, tier, fetcher);
  await connectDb();
  if ((await JobSource.countDocuments({ custom: true })) >= MAX_CUSTOM_SOURCES) return { ok: false, error: `You can add up to ${MAX_CUSTOM_SOURCES} companies` };
  const id = `custom-${board.ats}-${board.slug}`;
  if (await JobSource.exists({ $or: [{ _id: id }, { ats: board.ats, slug: board.slug }] })) return { ok: false, error: "That company is already in your sources" };
  const probe = await probeBoard(board.ats as BoardAts, board.slug, fetcher);
  if (!probe.ok) return { ok: false, error: probe.error };
  await JobSource.create({ _id: id, name: probe.company.slice(0, 120), kind: "board", ats: board.ats, slug: board.slug, tier: tier.slice(0, 40), custom: true, enabled: true });
  return { ok: true, id, name: probe.company, count: probe.count };
}

/**
 * Adds a company's own public career page (not an ATS board): it is read through the free reader, and the page must
 * actually yield job links before it is saved. Sites that forbid automated reading are refused.
 */
async function addCareerPage(rawUrl: string, tier: string, fetcher?: Fetcher): Promise<{ ok: true; id: string; name: string; count: number } | { ok: false; error: string }> {
  const url = rawUrl.trim();
  if (!isPublicCareerUrl(url)) return { ok: false, error: "Use the public https link of a company's careers page (LinkedIn, Naukri, Indeed and similar sites aren't allowed)" };
  await connectDb();
  if ((await JobSource.countDocuments({ custom: true })) >= MAX_CUSTOM_SOURCES) return { ok: false, error: `You can add up to ${MAX_CUSTOM_SOURCES} companies` };
  const host = new URL(url).hostname.replace(/^(www|careers|jobs)\./, "");
  const id = `custom-scrape-${createHash("sha256").update(url).digest("hex").slice(0, 10)}`;
  if (await JobSource.exists({ $or: [{ _id: id }, { kind: "scrape", url }] })) return { ok: false, error: "That page is already in your sources" };
  const name = host.split(".")[0]!.replace(/^./, (c) => c.toUpperCase()).slice(0, 120);
  let count: number;
  try {
    const r = await fetchCareerPage({ id, name, url }, fetcher);
    count = r.status === "ok" ? selectPostings(r.postings).length : 0;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't read that page" };
  }
  if (count === 0) return { ok: false, error: "No engineering job links were found on that page. Try the page that lists the openings, or a Greenhouse, Lever, Ashby, Workable or SmartRecruiters link" };
  await JobSource.create({ _id: id, name, kind: "scrape", ats: "scrape", slug: "", url, tier: tier.slice(0, 40), custom: true, enabled: true });
  return { ok: true, id, name, count };
}

export async function removeCustomSource(id: string): Promise<void> {
  await connectDb();
  const src = await JobSource.findOne({ _id: id, custom: true }).lean();
  if (!src) throw new Error("Only companies you added can be removed. Switch built-in ones off instead");
  await JobSource.deleteOne({ _id: id });
  await JobPosting.deleteMany({ sourceId: id, savedJobId: null });
  await bumpVersion("jobs");
}

/** Re-reads sources right now. With ids it forces just those; without, it does one normal rotation. */
export async function refreshSources(ids?: string[]): Promise<SyncSummary> {
  return syncJobs(ids ? { only: ids, force: true, budgetMs: 45_000 } : { budgetMs: 45_000 });
}

export { postingKey };
