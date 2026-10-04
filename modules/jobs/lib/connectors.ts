import "server-only";
import { z } from "zod";
import { fetchSafe, type SafeResponse } from "@/core/http-safe";
import { parseCareerMarkdown, readerUrl } from "@/modules/jobs/domain/job-push";
import { AGGREGATORS, parseArbeitnow, parseBoard, parseRemoteOk, parseRemotive, parseSmartRecruiters, parseSmartRecruitersDetail, SLUG_RE, type Aggregator, type BoardAts, type CareerSource, type NormalizedPosting } from "@/modules/jobs/domain/job-postings";

/** Responses from Greenhouse and Lever reach 5-6 MB for large companies, so the cap is generous. The body is never stored. */
const MAX_BYTES = 14_000_000;
const TIMEOUT_MS = 20_000;
const SR_PAGE = 100;
const SR_MAX_PAGES = 3;

/** The HTTP call, injectable so tests never touch the network. */
export type Fetcher = (url: string, opts: { etag?: string }) => Promise<Pick<SafeResponse, "status" | "text" | "headers">>;

export const defaultFetcher: Fetcher = (url, { etag }) =>
  fetchSafe(url, { timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES, accept: /json/i, headers: { accept: "application/json", ...(etag ? { "if-none-match": etag } : {}) } });

/** For the free reader: it answers with markdown or plain text, not JSON. */
export const defaultTextFetcher: Fetcher = (url) => fetchSafe(url, { timeoutMs: 30_000, maxBytes: 3_000_000, accept: /text|markdown/i, headers: { accept: "text/markdown, text/plain" } });

export type SourceResult = { status: "ok"; postings: NormalizedPosting[]; etag: string; total: number } | { status: "unchanged" };

const parse = (res: { text: string }): unknown => {
  try {
    return JSON.parse(res.text);
  } catch {
    throw new Error("The response was not JSON");
  }
};
const etagOf = (res: { headers: Headers }) => res.headers.get("etag") ?? "";

/** The one URL that lists a board's jobs. The host is fixed per ATS and the slug is validated, so nothing user-controlled reaches the host part. */
export function boardUrl(ats: BoardAts, slug: string, offset = 0): string {
  if (!SLUG_RE.test(slug)) throw new Error("Invalid board name");
  const s = encodeURIComponent(slug);
  switch (ats) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
    case "lever": return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${s}`;
    case "workable": return `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=${SR_PAGE}&offset=${offset}`;
  }
}

export const AGGREGATOR_URL_API: Record<Aggregator, string> = {
  remoteok: "https://remoteok.com/api",
  remotive: "https://remotive.com/api/remote-jobs?category=software-dev&limit=100",
  arbeitnow: "https://www.arbeitnow.com/api/job-board-api",
};

export async function fetchBoard(source: CareerSource, fetcher: Fetcher = defaultFetcher, etag = ""): Promise<SourceResult> {
  if (source.ats === "smartrecruiters") {
    const all: NormalizedPosting[] = [];
    let total = 0;
    for (let page = 0; page < SR_MAX_PAGES; page++) {
      const res = await fetcher(boardUrl("smartrecruiters", source.slug, page * SR_PAGE), {});
      const body = parseSmartRecruiters(parse(res), source);
      total = body.total;
      all.push(...body.postings);
      if (all.length >= total || body.postings.length === 0) break;
    }
    return { status: "ok", postings: all, etag: "", total };
  }
  const res = await fetcher(boardUrl(source.ats, source.slug), { etag });
  if (res.status === 304) return { status: "unchanged" };
  const postings = parseBoard(source.ats, parse(res), source);
  return { status: "ok", postings, etag: etagOf(res), total: postings.length };
}

export async function fetchAggregator(name: Aggregator, fetcher: Fetcher = defaultFetcher, etag = ""): Promise<SourceResult> {
  const res = await fetcher(AGGREGATOR_URL_API[name], { etag });
  if (res.status === 304) return { status: "unchanged" };
  const raw = parse(res);
  const postings = name === "remoteok" ? parseRemoteOk(raw) : name === "remotive" ? parseRemotive(raw) : parseArbeitnow(raw);
  return { status: "ok", postings, etag: etagOf(res), total: postings.length };
}

/**
 * A company's public career page, read through the free reader (markdown out), then the job links are picked out.
 * Only the page address goes to the reader; nothing about you does. Descriptions are not fetched: open a job to read it.
 */
export async function fetchCareerPage(source: { id: string; name: string; url: string }, fetcher: Fetcher = defaultTextFetcher): Promise<SourceResult> {
  const res = await fetcher(readerUrl(source.url), {});
  if (res.status >= 400) throw new Error(`The reader couldn't open that page (HTTP ${res.status})`);
  const postings = parseCareerMarkdown(res.text, source.url, source.name, source.id);
  return { status: "ok", postings, etag: "", total: postings.length };
}

/** SmartRecruiters' list has no description: fetch it for one posting when you open it. */
export async function fetchSmartRecruitersDescription(slug: string, externalId: string, fetcher: Fetcher = defaultFetcher): Promise<string> {
  if (!SLUG_RE.test(slug) || !/^\d{6,20}$/.test(externalId)) throw new Error("Invalid posting");
  const res = await fetcher(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${externalId}`, {});
  return parseSmartRecruitersDetail(parse(res));
}

export const isAggregator = (v: string): v is Aggregator => (AGGREGATORS as readonly string[]).includes(v);

/** Does this board exist and have open jobs? Used when you add a careers source by URL. */
export async function probeBoard(ats: BoardAts, slug: string, fetcher: Fetcher = defaultFetcher): Promise<{ ok: true; count: number; company: string } | { ok: false; error: string }> {
  try {
    const src: CareerSource = { id: slug, name: slug, tier: "", ats, slug };
    const r = await fetchBoard(src, fetcher);
    if (r.status !== "ok") return { ok: false, error: "No change" };
    if (r.total === 0) return { ok: false, error: "That board has no open jobs" };
    return { ok: true, count: r.total, company: r.postings[0]?.company || slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't read that board" };
  }
}

export const slugSchema = z.string().regex(SLUG_RE);
