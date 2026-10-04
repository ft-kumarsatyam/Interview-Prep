/**
 * Jobs that arrive from outside the public job-board APIs: pushed to the webhook (n8n, Zapier, Apify, your own script)
 * or read from a company's public career page through the free reader. Everything is untrusted text, so each item is
 * validated on its own and a bad one is dropped, never allowed to break the batch. LinkedIn, Naukri, Indeed, Wellfound
 * and similar sites are refused by host: PrepOS never fetches them and never accepts their listings. Pure.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { cap, JD_STORE_MAX, type NormalizedPosting } from "@/modules/jobs/domain/job-postings";
import { htmlToPlain } from "@/modules/jobs/domain/jobs";

/** Sites whose terms forbid automated reading. Matches the host and any subdomain. */
const BLOCKED = /(^|\.)(linkedin|naukri|indeed|wellfound|angel|glassdoor|monster|foundit|shine|instahyre|hirist|cutshort)\.(com|in|co|co\.in|io)$/i;

export function isBlockedJobHost(url: string): boolean {
  try {
    return BLOCKED.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

/** A public https page on a real host: no IP literals, no localhost, no internal names, and not a blocked site. */
export function isPublicCareerUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  return !BLOCKED.test(host);
}

const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https:\/\//i.test(u), "must be https")
  .refine((u) => !isBlockedJobHost(u), "that site is not accepted");

export const pushedPostingSchema = z.object({
  title: z.string().trim().min(2).max(200),
  company: z.string().trim().min(1).max(160),
  url: httpsUrl,
  applyUrl: httpsUrl.optional(),
  location: z.string().trim().max(300).optional(),
  remote: z.boolean().nullish(),
  department: z.string().trim().max(100).optional(),
  description: z.string().max(60_000).optional(),
  postedAt: z.union([z.string(), z.number()]).nullish(),
  externalId: z.string().trim().min(1).max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});
export type PushedPosting = z.infer<typeof pushedPostingSchema>;

export const MAX_PUSH_BATCH = 100;

const idOf = (url: string) => createHash("sha256").update(url.split("#")[0]!).digest("hex").slice(0, 16);

function isoDate(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const ms = typeof v === "number" ? (v < 1e11 ? v * 1000 : v) : Date.parse(v);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86_400_000 ? null : d.toISOString();
}

export function normalizePushed(p: PushedPosting, source: "webhook" | "scrape", sourceId: string): NormalizedPosting {
  return {
    source,
    sourceId,
    externalId: p.externalId ?? idOf(p.url),
    title: p.title.replace(/\s+/g, " "),
    company: p.company,
    location: p.location ?? "",
    remote: p.remote ?? (p.location && /\bremote\b/i.test(p.location) ? true : null),
    department: p.department ?? "",
    postedAt: isoDate(p.postedAt),
    url: p.url,
    applyUrl: p.applyUrl ?? p.url,
    jd: cap(htmlToPlain(p.description ?? ""), JD_STORE_MAX),
    tags: p.tags ?? [],
  };
}

export interface ParsedBatch {
  postings: NormalizedPosting[];
  rejected: number;
}

/** Validates a pushed batch item by item. A non-array or an oversized batch is an error for the caller, not a partial success. */
export function parsePushedBatch(raw: unknown, source: "webhook" | "scrape", sourceId: string): ParsedBatch {
  if (!Array.isArray(raw)) throw new Error("`jobs` must be an array");
  if (raw.length > MAX_PUSH_BATCH) throw new Error(`At most ${MAX_PUSH_BATCH} jobs per request`);
  const postings: NormalizedPosting[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  for (const item of raw) {
    const parsed = pushedPostingSchema.safeParse(item);
    if (!parsed.success) {
      rejected++;
      continue;
    }
    const n = normalizePushed(parsed.data, source, sourceId);
    if (seen.has(n.externalId)) continue;
    seen.add(n.externalId);
    postings.push(n);
  }
  return { postings, rejected };
}

/* ------------------------------------ career pages ------------------------------------ */

/** Hosts of the applicant-tracking systems and big career platforms: a link there is a job even from another domain. */
const ATS_HOSTS = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|myworkdayjobs\.com|icims\.com|jobvite\.com|recruitee\.com|breezy\.hr|bamboohr\.com|teamtailor\.com|rippling\.com|personio\.(de|com)|pinpointhq\.com|dover\.com)$/i;
const JOB_PATH = /\/(jobs?|careers?|positions?|openings?|opportunit\w*|vacanc\w*|roles?|requisition|apply|postings?)(\/|$|-)|[?&](gh_jid|jobid|job_id|jid)=/i;
/** Link texts that are navigation, not job titles. */
const NAV_TEXT = /^(apply( now)?|careers?|jobs?|open (roles|positions)|view (all|more|job|details)|see (all|more)|learn more|read more|home|about( us)?|contact|login|sign ?(in|up)|search|filters?|next|previous|back|more|all jobs|join (us|our team)|life at .*|our (team|culture|values)|privacy|terms|cookie.*|share|save|alert.*|subscribe|load more|show more)$/i;

/** Pulls `[text](url)` links out of the reader's markdown, ignoring images. Titles are cleaned of markdown noise. */
function links(md: string): Array<{ text: string; href: string }> {
  const out: Array<{ text: string; href: string }> = [];
  for (const m of md.matchAll(/(?<!!)\[([^\]\n]{2,400})\]\((\S+?)(?:\s+"[^"]*")?\)/g)) {
    const text = m[1]!
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/[*_`#>]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    out.push({ text, href: m[2]! });
  }
  return out;
}

/**
 * Finds job links on a career page given as markdown. A link counts when it points to a job-looking path on the same
 * site or on a known applicant-tracking host, its text reads like a role (not navigation), and it is not a blocked site.
 * The result is a list of candidates; the caller still filters to engineering roles.
 */
export function parseCareerMarkdown(md: string, pageUrl: string, company: string, sourceId: string): NormalizedPosting[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const baseHost = base.hostname.toLowerCase().replace(/^www\./, "");
  const sameSite = (h: string) => {
    const host = h.toLowerCase().replace(/^www\./, "");
    return host === baseHost || host.endsWith(`.${baseHost}`) || baseHost.endsWith(`.${host.split(".").slice(-2).join(".")}`);
  };
  const out: NormalizedPosting[] = [];
  const seen = new Set<string>();
  for (const { text, href } of links(md)) {
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.protocol !== "https:") continue;
    u.hash = "";
    const url = u.toString();
    if (seen.has(url) || isBlockedJobHost(url)) continue;
    if (!(sameSite(u.hostname) || ATS_HOSTS.test(u.hostname))) continue;
    if (!JOB_PATH.test(u.pathname + u.search)) continue;
    if (u.pathname.replace(/\/+$/, "") === base.pathname.replace(/\/+$/, "") && u.hostname === base.hostname) continue; // the page itself
    if (text.length < 5 || text.length > 140 || NAV_TEXT.test(text) || /^https?:\/\//i.test(text)) continue;
    seen.add(url);
    // "Backend Engineer - Bengaluru" or "Backend Engineer | Remote": the part after the separator is the place.
    const [title, place] = text.split(/\s+(?:[-–—|·•]|•)\s+/, 2);
    const location = place && place.length <= 60 ? place : "";
    out.push({
      source: "scrape",
      sourceId,
      externalId: idOf(url),
      title: (title ?? text).trim(),
      company,
      location,
      remote: /\bremote\b/i.test(`${location} ${text}`) ? true : null,
      department: "",
      postedAt: null,
      url,
      applyUrl: url,
      jd: "",
      tags: [],
    });
  }
  return out;
}

/** The free reader that turns a public page into markdown. The page address is appended as its path. */
export const READER_BASE = "https://r.jina.ai/";
export const readerUrl = (pageUrl: string) => `${READER_BASE}${pageUrl}`;
