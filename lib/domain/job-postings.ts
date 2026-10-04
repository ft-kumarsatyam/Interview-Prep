/**
 * Discovered job postings: one normalised shape for every source, the parsers that turn each public
 * job-board API response into it, and the rules for what is worth keeping. Everything here is untrusted
 * text from the internet, so each item is validated on its own: a malformed posting is skipped, never
 * allowed to break the whole fetch. Pure.
 */
import { z } from "zod";
import { htmlToPlain } from "./jobs";

export const BOARD_ATS = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters"] as const;
export const AGGREGATORS = ["remoteok", "remotive", "arbeitnow"] as const;
export const POSTING_SOURCES = [...BOARD_ATS, ...AGGREGATORS] as const;
export type BoardAts = (typeof BOARD_ATS)[number];
export type Aggregator = (typeof AGGREGATORS)[number];
export type PostingSource = (typeof POSTING_SOURCES)[number];

export const AGGREGATOR_LABEL: Record<Aggregator, string> = { remoteok: "Remote OK", remotive: "Remotive", arbeitnow: "Arbeitnow" };
export const AGGREGATOR_URL: Record<Aggregator, string> = { remoteok: "https://remoteok.com", remotive: "https://remotive.com", arbeitnow: "https://www.arbeitnow.com" };

export const JD_STORE_MAX = 8000;
export const SLUG_RE = /^[a-z0-9][a-z0-9_.-]{0,60}$/i;

/** A company whose public board PrepOS reads (from data/careers.json or added in the UI). */
export interface CareerSource {
  id: string;
  name: string;
  tier: string;
  ats: BoardAts;
  slug: string;
  companyId?: string;
}

export interface NormalizedPosting {
  source: PostingSource;
  /** The careers source id for a company board; the aggregator name for an aggregator. */
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean | null;
  department: string;
  postedAt: string | null;
  url: string;
  applyUrl: string;
  /** Plain text, capped. Empty when the list endpoint has none (see `needsDescription`). */
  jd: string;
  tags: string[];
}

export const postingKey = (p: Pick<NormalizedPosting, "source" | "sourceId" | "externalId">) => `${p.source}:${p.sourceId}:${p.externalId}`;

/* ----------------------------------- text ----------------------------------- */

const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
/** Greenhouse sends its descriptions HTML-escaped ("&lt;p&gt;"): undo one level of escaping, then strip the markup. */
export function unescapeHtml(s: string): string {
  return s.replace(/&(?:lt|gt|amp|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);
}

export const cap = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);
/** HTML to plain text. Some boards escape their HTML, which only becomes markup after one decode, so strip again if tags remain. */
const text = (html: string | null | undefined, n = JD_STORE_MAX) => {
  let out = htmlToPlain(html ?? "");
  for (let i = 0; i < 2 && /<\/?[a-z][^>]*>/i.test(out); i++) out = htmlToPlain(out);
  return cap(out, n);
};
const plain = (s: string | null | undefined, n = 200) => cap((s ?? "").replace(/\s+/g, " ").trim(), n);
const iso = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = v < 1e11 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
};
const https = (v: unknown): string => (typeof v === "string" && /^https:\/\/[^\s]+$/.test(v) && v.length <= 2000 ? v : "");
const isRemoteText = (s: string) => /\bremote\b/i.test(s);

/* ------------------------------ what is worth keeping ------------------------------ */

const TECH = /\b(engineer(?:ing)?|developer|programmer|sde|swe|sdet|software|backend|back-end|frontend|front-end|full[- ]?stack|devops|sre|site reliability|platform|infrastructure|data (?:scientist|engineer|analyst)|machine learning|ml|ai|research (?:scientist|engineer)|security engineer|qa|android|ios|mobile|firmware|embedded|architect|technical lead)\b/i;
const NOT_TECH = /\b(program manager|product manager|project manager|sales|account (?:executive|manager)|recruit(?:er|ing)|marketing|legal|counsel|finance|accountant|payroll|people partner|hr\b|human resources|customer success|support specialist|copywriter|designer|content|operations manager|business development)\b/i;
const STRONG_TECH = /\b(software|backend|back-end|frontend|front-end|full[- ]?stack|developer|sde|swe|programmer|devops|sre|machine learning)\b/i;

/** Engineering-type roles. A sales engineer or a marketing role that mentions "data" is not one. */
export function isTechRole(title: string): boolean {
  if (!TECH.test(title)) return false;
  return !NOT_TECH.test(title) || STRONG_TECH.test(title);
}

/* --------------------------------- the parsers --------------------------------- */

function each<T>(raw: unknown, schema: z.ZodType<T>, map: (item: T) => NormalizedPosting | null): NormalizedPosting[] {
  if (!Array.isArray(raw)) throw new Error("Unexpected response shape");
  const out: NormalizedPosting[] = [];
  for (const item of raw) {
    const parsed = schema.safeParse(item);
    if (!parsed.success) continue;
    const posting = map(parsed.data);
    if (posting && posting.title && posting.url) out.push(posting);
  }
  return out;
}
const top = <T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> => {
  const r = schema.safeParse(raw);
  if (!r.success) throw new Error("Unexpected response shape");
  return r.data;
};
const base = (source: PostingSource, sourceId: string, company: string): Pick<NormalizedPosting, "source" | "sourceId" | "company" | "tags"> => ({ source, sourceId, company, tags: [] });
const str = z.string().nullish();
const idish = z.union([z.string(), z.number()]).transform(String);

const ghItem = z.object({ id: idish, title: z.string(), absolute_url: z.string(), location: z.object({ name: str }).nullish(), updated_at: str, first_published: str, content: str, departments: z.array(z.object({ name: str })).nullish(), company_name: str });
export function parseGreenhouse(raw: unknown, s: Pick<CareerSource, "id" | "name">): NormalizedPosting[] {
  const { jobs } = top(z.object({ jobs: z.array(z.unknown()) }), raw);
  return each(jobs, ghItem, (j) => {
    const loc = plain(j.location?.name);
    const url = https(j.absolute_url);
    return { ...base("greenhouse", s.id, j.company_name || s.name), externalId: j.id, title: plain(j.title, 200), location: loc, remote: isRemoteText(loc) ? true : null, department: plain(j.departments?.[0]?.name, 100), postedAt: iso(j.first_published) ?? iso(j.updated_at), url, applyUrl: url, jd: text(unescapeHtml(j.content ?? "")) };
  });
}

const lvItem = z.object({ id: z.string(), text: z.string(), hostedUrl: str, applyUrl: str, createdAt: z.number().nullish(), categories: z.object({ location: str, team: str, department: str, allLocations: z.array(z.string()).nullish() }).nullish(), workplaceType: str, descriptionPlain: str, additionalPlain: str, lists: z.array(z.object({ text: str, content: str })).nullish() });
export function parseLever(raw: unknown, s: Pick<CareerSource, "id" | "name">): NormalizedPosting[] {
  return each(raw, lvItem, (j) => {
    const cat = j.categories;
    const loc = plain([...new Set([cat?.location, ...(cat?.allLocations ?? [])].filter(Boolean))].join("; "));
    const lists = (j.lists ?? []).map((l) => `${l.text ?? ""}\n${htmlToPlain(l.content ?? "")}`).join("\n\n");
    const url = https(j.hostedUrl);
    return { ...base("lever", s.id, s.name), externalId: j.id, title: plain(j.text, 200), location: loc, remote: j.workplaceType ? j.workplaceType === "remote" : isRemoteText(loc) ? true : null, department: plain(cat?.team ?? cat?.department, 100), postedAt: iso(j.createdAt), url, applyUrl: https(j.applyUrl) || url, jd: cap([j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join("\n\n"), JD_STORE_MAX) };
  });
}

const abItem = z.object({ id: z.string(), title: z.string(), department: str, team: str, location: str, secondaryLocations: z.array(z.object({ location: str })).nullish(), isRemote: z.boolean().nullish(), isListed: z.boolean().nullish(), publishedAt: str, jobUrl: str, applyUrl: str, descriptionPlain: str, descriptionHtml: str });
export function parseAshby(raw: unknown, s: Pick<CareerSource, "id" | "name">): NormalizedPosting[] {
  const { jobs } = top(z.object({ jobs: z.array(z.unknown()) }), raw);
  return each(jobs, abItem, (j) => {
    if (j.isListed === false) return null;
    const loc = plain([j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join("; "));
    const url = https(j.jobUrl);
    return { ...base("ashby", s.id, s.name), externalId: j.id, title: plain(j.title, 200), location: loc, remote: j.isRemote ?? null, department: plain(j.department ?? j.team, 100), postedAt: iso(j.publishedAt), url, applyUrl: https(j.applyUrl) || url, jd: j.descriptionPlain ? cap(j.descriptionPlain, JD_STORE_MAX) : text(j.descriptionHtml) };
  });
}

const wkItem = z.object({ shortcode: z.string(), title: z.string(), department: str, url: str, application_url: str, shortlink: str, country: str, city: str, state: str, telecommuting: z.boolean().nullish(), published_on: str, created_at: str, description: str });
export function parseWorkable(raw: unknown, s: Pick<CareerSource, "id" | "name">): NormalizedPosting[] {
  const { jobs, name } = top(z.object({ name: str, jobs: z.array(z.unknown()) }), raw);
  return each(jobs, wkItem, (j) => {
    const url = https(j.url) || https(j.shortlink);
    return { ...base("workable", s.id, name || s.name), externalId: j.shortcode, title: plain(j.title, 200), location: plain([j.city, j.state, j.country].filter(Boolean).join(", ")), remote: j.telecommuting ?? null, department: plain(j.department, 100), postedAt: iso(j.published_on) ?? iso(j.created_at), url, applyUrl: https(j.application_url) || url, jd: text(j.description) };
  });
}

const srItem = z.object({ id: z.string(), name: z.string(), releasedDate: str, company: z.object({ identifier: str, name: str }).nullish(), location: z.object({ city: str, country: str, remote: z.boolean().nullish(), fullLocation: str }).nullish(), department: z.object({ label: str }).nullish() });
export function parseSmartRecruiters(raw: unknown, s: Pick<CareerSource, "id" | "name" | "slug">): { postings: NormalizedPosting[]; total: number } {
  const body = top(z.object({ totalFound: z.number().nullish(), content: z.array(z.unknown()) }), raw);
  const postings = each(body.content, srItem, (j) => {
    const loc = plain(j.location?.fullLocation ?? [j.location?.city, j.location?.country].filter(Boolean).join(", "));
    const url = `https://jobs.smartrecruiters.com/${encodeURIComponent(j.company?.identifier || s.slug)}/${encodeURIComponent(j.id)}`;
    return { ...base("smartrecruiters", s.id, j.company?.name || s.name), externalId: j.id, title: plain(j.name, 200), location: loc, remote: j.location?.remote ?? (isRemoteText(loc) ? true : null), department: plain(j.department?.label, 100), postedAt: iso(j.releasedDate), url, applyUrl: url, jd: "" };
  });
  return { postings, total: body.totalFound ?? postings.length };
}

/** SmartRecruiters lists omit the description: this reads it from the single-posting response. */
export function parseSmartRecruitersDetail(raw: unknown): string {
  const d = top(z.object({ jobAd: z.object({ sections: z.record(z.string(), z.object({ title: str, text: str }).partial()) }) }), raw);
  const order = ["companyDescription", "jobDescription", "qualifications", "additionalInformation"];
  const parts = order.map((k) => d.jobAd.sections[k]).filter(Boolean).map((sec) => `${sec!.title ?? ""}\n${htmlToPlain(sec!.text ?? "")}`.trim());
  return cap(parts.join("\n\n"), JD_STORE_MAX);
}

const rokItem = z.object({ id: idish, epoch: z.number().nullish(), date: str, company: z.string(), position: z.string(), tags: z.array(z.string()).nullish(), description: str, location: str, url: str, apply_url: str });
export function parseRemoteOk(raw: unknown): NormalizedPosting[] {
  // The first element is a legal notice, not a job: it fails the item schema and is skipped.
  return each(raw, rokItem, (j) => {
    const url = https(j.url);
    return { ...base("remoteok", "remoteok", plain(j.company, 120)), externalId: j.id, title: plain(j.position, 200), location: plain(j.location) || "Remote", remote: true, department: "", postedAt: iso(j.date) ?? iso(j.epoch), url, applyUrl: https(j.apply_url) || url, jd: text(j.description), tags: (j.tags ?? []).slice(0, 8) };
  });
}

const rvItem = z.object({ id: idish, url: str, title: z.string(), company_name: z.string(), category: str, tags: z.array(z.string()).nullish(), job_type: str, publication_date: str, candidate_required_location: str, description: str });
export function parseRemotive(raw: unknown): NormalizedPosting[] {
  const { jobs } = top(z.object({ jobs: z.array(z.unknown()) }), raw);
  return each(jobs, rvItem, (j) => {
    const url = https(j.url);
    return { ...base("remotive", "remotive", plain(j.company_name, 120)), externalId: j.id, title: plain(j.title, 200), location: plain(j.candidate_required_location) || "Remote", remote: true, department: plain(j.category, 100), postedAt: iso(j.publication_date), url, applyUrl: url, jd: text(j.description), tags: (j.tags ?? []).slice(0, 8) };
  });
}

const anItem = z.object({ slug: z.string(), company_name: z.string(), title: z.string(), description: str, remote: z.boolean().nullish(), url: str, tags: z.array(z.string()).nullish(), location: str, created_at: z.number().nullish() });
export function parseArbeitnow(raw: unknown): NormalizedPosting[] {
  const { data } = top(z.object({ data: z.array(z.unknown()) }), raw);
  return each(data, anItem, (j) => {
    const url = https(j.url);
    return { ...base("arbeitnow", "arbeitnow", plain(j.company_name, 120)), externalId: j.slug, title: plain(j.title, 200), location: plain(j.location), remote: j.remote ?? null, department: "", postedAt: iso(j.created_at), url, applyUrl: url, jd: text(j.description), tags: (j.tags ?? []).slice(0, 8) };
  });
}

export function parseBoard(ats: BoardAts, raw: unknown, source: CareerSource): NormalizedPosting[] {
  switch (ats) {
    case "greenhouse": return parseGreenhouse(raw, source);
    case "lever": return parseLever(raw, source);
    case "ashby": return parseAshby(raw, source);
    case "workable": return parseWorkable(raw, source);
    case "smartrecruiters": return parseSmartRecruiters(raw, source).postings;
  }
}

/* --------------------------------- careers URLs --------------------------------- */

/** The page where a board's jobs live, for "view all openings" links. */
export function careersUrl(ats: BoardAts, slug: string): string {
  const s = encodeURIComponent(slug);
  return { greenhouse: `https://boards.greenhouse.io/${s}`, lever: `https://jobs.lever.co/${s}`, ashby: `https://jobs.ashbyhq.com/${s}`, workable: `https://apply.workable.com/${s}`, smartrecruiters: `https://careers.smartrecruiters.com/${s}` }[ats];
}

/** Recognises a board URL a person pastes and returns its ATS and slug. Null when it isn't one of the five. */
export function detectBoard(raw: string): { ats: BoardAts; slug: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
  const ok = (ats: BoardAts, slug: string) => (SLUG_RE.test(slug) ? { ats, slug: slug.toLowerCase() } : null);
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io" || host === "boards-api.greenhouse.io") return ok("greenhouse", host === "boards-api.greenhouse.io" ? (u.pathname.match(/\/boards\/([^/]+)/)?.[1] ?? "") : first);
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") return ok("lever", first);
  if (host === "jobs.ashbyhq.com") return ok("ashby", first);
  if (host === "apply.workable.com") return ok("workable", first);
  if (host === "careers.smartrecruiters.com" || host === "jobs.smartrecruiters.com") return ok("smartrecruiters", first);
  return null;
}
