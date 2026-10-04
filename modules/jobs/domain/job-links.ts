/**
 * Links that open a job search on a site that has no public API (LinkedIn, Naukri, Indeed, Wellfound...)
 * or on a big company's own careers page, prefilled from your preferences. PrepOS never calls these sites:
 * the link opens in your own browser, where you are signed in. Pure.
 */
const enc = encodeURIComponent;
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface SearchLink {
  id: string;
  name: string;
  url: string;
  note: string;
}

export interface SearchQuery {
  role: string;
  location: string;
  remote: boolean;
  /** Only roles posted in the last N days (where the site supports it). */
  days?: 1 | 7 | 30;
}

export function boardSearchLinks(q: SearchQuery): SearchLink[] {
  const role = q.role.trim() || "software engineer";
  const loc = q.location.trim();
  const secs = { 1: 86_400, 7: 604_800, 30: 2_592_000 }[q.days ?? 7];
  const roleSlug = slug(role);
  const locSlug = slug(loc);
  return [
    { id: "linkedin", name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${enc(role)}${loc ? `&location=${enc(loc)}` : ""}&f_TPR=r${secs}${q.remote ? "&f_WT=2" : ""}`, note: "Sign in to see everything and use Easy Apply." },
    { id: "naukri", name: "Naukri", url: `https://www.naukri.com/${roleSlug}-jobs${locSlug ? `-in-${locSlug}` : ""}`, note: "Strongest for India. Turn on its job alerts for new roles." },
    { id: "indeed", name: "Indeed", url: `https://in.indeed.com/jobs?q=${enc(role)}${loc ? `&l=${enc(loc)}` : ""}&fromage=${(q.days ?? 7) === 30 ? 30 : q.days ?? 7}${q.remote ? "&sc=0kf%3Aattr(DSQF7)%3B" : ""}`, note: "Uses the India site; change the domain for other countries." },
    { id: "wellfound", name: "Wellfound", url: q.remote ? `https://wellfound.com/role/r/${roleSlug}` : `https://wellfound.com/role/l/${roleSlug}${locSlug ? `/${locSlug}` : ""}`, note: "Startups. Salary and equity are shown up front." },
    { id: "google-jobs", name: "Google Jobs", url: `https://www.google.com/search?q=${enc(`${role} jobs${loc ? ` in ${loc}` : ""}${q.remote ? " remote" : ""}`)}&ibp=htl;jobs`, note: "Aggregates postings from many sites." },
  ];
}

/** A big company's own careers search with your role and place filled in, or null if it has no such URL. */
export function companySearchUrl(template: string | undefined, q: Pick<SearchQuery, "role" | "location">): string | null {
  if (!template) return null;
  return template.replace("{q}", enc(q.role.trim() || "software engineer")).replace("{l}", enc(q.location.trim()));
}
