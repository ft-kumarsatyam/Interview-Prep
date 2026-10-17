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

/** One-click role names for an AI search. The title variants are what postings actually call these jobs. */
export const AI_ROLE_PRESETS: ReadonlyArray<{ role: string; keywords: readonly string[] }> = [
  { role: "AI Engineer", keywords: ["LLM", "RAG", "Python", "evals"] },
  { role: "LLM Engineer", keywords: ["LLM", "fine-tuning", "RAG", "PyTorch"] },
  { role: "Applied AI Engineer", keywords: ["applied AI", "RAG", "agents", "evals"] },
  { role: "GenAI Engineer", keywords: ["generative AI", "LangChain", "vector database"] },
  { role: "AI Agent Engineer", keywords: ["agents", "LangGraph", "MCP", "tool use"] },
  { role: "Machine Learning Engineer", keywords: ["PyTorch", "MLOps", "deployment"] },
  { role: "MLOps Engineer", keywords: ["MLOps", "Kubernetes", "MLflow", "CI/CD"] },
];

/** Hosts of public applicant-tracking boards. A Google `site:` search over them finds roles that no job site lists. */
const ATS_HOSTS = ["boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com", "apply.workable.com"] as const;

/**
 * Boards and searches aimed at AI roles. All are links that open in your own browser; PrepOS never fetches them.
 * The Google searches look across the public boards of many companies at once.
 */
export function aiSearchLinks(q: SearchQuery): SearchLink[] {
  const role = q.role.trim() || "AI engineer";
  const loc = q.location.trim();
  const extra = `${loc ? ` ${loc}` : ""}${q.remote ? " remote" : ""}`;
  const sites = ATS_HOSTS.map((h) => `site:${h}`).join(" OR ");
  const when = { 1: "d", 7: "w", 30: "m" }[q.days ?? 7];
  return [
    { id: "google-ats", name: "Google: company job boards", url: `https://www.google.com/search?q=${enc(`(${sites}) "${role}"${extra}`)}&tbs=qdr:${when}`, note: "Searches Greenhouse, Lever, Ashby and Workable boards across many companies at once." },
    { id: "agentic-jobs", name: "Agentic Engineering Jobs", url: "https://agentic-engineering-jobs.com/", note: "Agent, LLM and RAG roles, with pages per country and framework." },
    { id: "remoteok-ai", name: "Remote OK: AI", url: "https://remoteok.com/remote-ai-jobs", note: "Remote AI roles. PrepOS already reads this feed on its own." },
    { id: "peerlist", name: "Peerlist", url: `https://peerlist.io/jobs?q=${enc(role)}`, note: "Startup roles with skill filters (LLM, RAG). Sign in to apply." },
    { id: "weekday", name: "Weekday", url: `https://www.weekday.works/`, note: "India-focused AI roles with a remote filter; search for your role there." },
    { id: "hn-hiring", name: "Hacker News: Who is hiring", url: `https://hn.algolia.com/?dateRange=pastMonth&query=${enc(`${role}${extra}`)}&type=comment`, note: "Monthly hiring threads, searched for your role. Direct contact with the team." },
  ];
}
