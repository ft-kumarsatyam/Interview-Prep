/**
 * ATS scoring: how well a resume survives an applicant tracking system and how well it matches a job
 * description. Deterministic and explainable: every check carries a score, a weight and a fix, so the
 * number never comes from a model. Pure.
 */
import { allBullets, DATE_RANGE, isBullet, parseResumeText, wordsIn, type ResumeDoc } from "./resume";

export interface AtsCheck {
  id: string;
  label: string;
  /** 0-1. */
  score: number;
  weight: number;
  detail: string;
  /** What to do when the score is below 1. */
  fix?: string;
}

export interface KeywordHit {
  term: string;
  /** How many times the JD asks for it, and whether it sits under a "nice to have" heading. */
  count: number;
  nice: boolean;
  found: boolean;
}

export interface AtsResult {
  /** 0-100. */
  score: number;
  verdict: "strong" | "good" | "needs work" | "weak";
  checks: AtsCheck[];
  keywords: { hits: KeywordHit[]; matchPct: number } | null;
  missing: string[];
  /** The fixes for the checks that lost the most points, biggest first. */
  topFixes: string[];
}

const ACTION_VERBS = new Set(
  `achieved architected automated built championed collaborated conducted configured consolidated created cut debugged decreased delivered deployed designed developed devised drove eliminated enabled engineered enhanced established executed expanded facilitated generated implemented improved increased initiated integrated introduced launched led managed mentored migrated modernized monitored negotiated optimized orchestrated owned partnered pioneered planned prevented produced programmed published raised rebuilt reduced refactored released remodeled replaced resolved restructured revamped reviewed scaled secured shipped simplified solved spearheaded standardized streamlined strengthened supported tested trained transformed tuned upgraded wrote analysed analyzed authored boosted coordinated formulated instituted maintained organized overhauled resolved delivered accelerated`.split(/\s+/),
);

const WEAK_PHRASES: Array<[RegExp, string]> = [
  [/\bresponsible for\b/i, "“responsible for” describes a duty, not a result"],
  [/\bworked on\b/i, "“worked on” hides what you actually did"],
  [/\b(helped|assisted) (with|in|to)\b/i, "“helped with” hides your part"],
  [/\bvarious\b|\betc\.?\b|\bmultiple things\b/i, "“various / etc.” says nothing specific"],
  [/\b(hard[- ]?working|team player|self[- ]?motivated|go[- ]getter|detail[- ]oriented|passionate)\b/i, "buzzwords with no proof"],
  [/^\s*(i|my|me)\b/im, "first-person pronouns (resumes drop “I”)"],
];

const METRIC = /(\d[\d,.]*\s?(%|x\b|k\b|m\b|ms\b|s\b|req|rps|qps|users|customers|requests|tps|gb|tb|mb)|[$₹€£]\s?\d|\b\d{2,}\b|\b\d+\+)/i;
const SYMBOLS = /[←-⇿☀-➿\u{1f300}-\u{1faff}-]/u;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pctText = (n: number, d: number) => `${n} of ${d}`;

/* --------------------------------- JD keywords --------------------------------- */

/** Canonical term -> spellings that count as the same thing. */
const TERMS: Record<string, string[]> = {
  javascript: ["javascript", "js", "ecmascript", "es6"],
  typescript: ["typescript", "ts"],
  react: ["react", "react.js", "reactjs"],
  "next.js": ["next.js", "nextjs", "next js"],
  "node.js": ["node.js", "nodejs", "node js", "node"],
  nestjs: ["nestjs", "nest.js", "nest js"],
  express: ["express", "express.js", "expressjs"],
  python: ["python"],
  java: ["java"],
  "c++": ["c++", "cpp"],
  go: ["golang", "go lang", "go (golang)"],
  rust: ["rust"],
  kotlin: ["kotlin"],
  swift: ["swift"],
  sql: ["sql"],
  postgresql: ["postgresql", "postgres"],
  mysql: ["mysql"],
  mongodb: ["mongodb", "mongo db", "mongo"],
  redis: ["redis"],
  cockroachdb: ["cockroachdb", "cockroach db", "cockroach"],
  dynamodb: ["dynamodb", "dynamo db"],
  cassandra: ["cassandra"],
  elasticsearch: ["elasticsearch", "elastic search", "opensearch"],
  kafka: ["kafka"],
  rabbitmq: ["rabbitmq", "rabbit mq"],
  graphql: ["graphql"],
  "rest api": ["rest api", "rest apis", "restful", "rest"],
  grpc: ["grpc"],
  microservices: ["microservices", "microservice"],
  "system design": ["system design", "distributed systems", "scalable systems", "high availability", "low latency"],
  "data structures": ["data structures", "algorithms", "dsa"],
  aws: ["aws", "amazon web services"],
  gcp: ["gcp", "google cloud"],
  azure: ["azure"],
  docker: ["docker", "containers", "containerization"],
  kubernetes: ["kubernetes", "k8s"],
  terraform: ["terraform"],
  "ci/cd": ["ci/cd", "ci cd", "cicd", "continuous integration", "github actions", "jenkins", "gitlab ci"],
  git: ["git", "github", "gitlab"],
  linux: ["linux", "unix", "bash", "shell scripting"],
  html: ["html", "html5"],
  css: ["css", "css3", "sass", "scss", "tailwind", "tailwindcss"],
  redux: ["redux", "zustand", "mobx"],
  testing: ["unit testing", "integration testing", "jest", "vitest", "mocha", "cypress", "playwright", "tdd", "pytest", "junit"],
  agile: ["agile", "scrum", "kanban"],
  "machine learning": ["machine learning", "ml", "deep learning", "pytorch", "tensorflow"],
  llm: ["llm", "llms", "generative ai", "genai", "rag", "prompt engineering"],
  websockets: ["websocket", "websockets", "socket.io", "real-time", "realtime"],
  oauth: ["oauth", "oauth2", "jwt", "sso", "authentication", "authorization"],
  "design patterns": ["design patterns", "solid", "oop", "object-oriented", "object oriented"],
  "ssr": ["ssr", "server-side rendering", "server side rendering", "ssg"],
  performance: ["performance optimization", "performance tuning", "web vitals", "profiling"],
  security: ["owasp", "application security", "secure coding"],
  observability: ["observability", "monitoring", "prometheus", "grafana", "datadog", "opentelemetry"],
  leadership: ["mentoring", "mentorship", "tech lead", "led a team", "leadership", "code review"],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const spellRe = (s: string) => new RegExp(`(?<![\\w+#.])${escapeRe(s)}(?![\\w+#]|\\.\\w)`, "gi");
/** A line that opens a "nice to have" block: short, not a bullet, and says so. */
const NICE_HEADING = /(nice[- ]to[- ]have|good to have|preferred|bonus|desirable|optional|a plus|plus points?)/i;
/** Inside a single requirement, only unambiguous phrases count ("plus" alone is too common). */
const NICE_INLINE = /(nice[- ]to[- ]have|good to have|preferred|bonus|a plus|is an advantage|desirable)/i;

/** The terms a JD asks for, with how often, and whether they come after a "nice to have" cue. Most-asked first. */
export function extractJdTerms(jd: string): Array<{ term: string; count: number; nice: boolean }> {
  const lines = jd.split(/\n+/);
  const out = new Map<string, { count: number; niceCount: number }>();
  let niceMode = false;
  for (const l of lines) {
    const t = l.trim();
    const bullet = /^[-•*●▪–\d]/.test(t);
    if (!bullet && t.length <= 50 && NICE_HEADING.test(t)) niceMode = true;
    else if (!bullet && t.length <= 60 && /^(requirements?|responsibilit|qualifications?|what you|must[- ]have|about|key skills)/i.test(t)) niceMode = false;
    const nice = niceMode || NICE_INLINE.test(l);
    for (const [term, spellings] of Object.entries(TERMS)) {
      let n = 0;
      for (const s of spellings) n += l.match(spellRe(s))?.length ?? 0;
      if (n > 0) {
        const cur = out.get(term) ?? { count: 0, niceCount: 0 };
        cur.count += Math.min(n, 2);
        if (nice) cur.niceCount += Math.min(n, 2);
        out.set(term, cur);
      }
    }
  }
  return [...out]
    .map(([term, v]) => ({ term, count: v.count, nice: v.niceCount >= v.count }))
    .toSorted((a, b) => Number(a.nice) - Number(b.nice) || b.count - a.count || a.term.localeCompare(b.term));
}

/** Every spelling that counts as this canonical term (the term itself when it is not in the vocabulary). */
export const spellingsOf = (term: string): readonly string[] => TERMS[term] ?? [term];

export function resumeHasTerm(text: string, term: string): boolean {
  return (TERMS[term] ?? [term]).some((s) => spellRe(s).test(text));
}

/** Canonical terms (from the same vocabulary the JD matcher uses) that a piece of text mentions. */
export function termsIn(text: string): string[] {
  return Object.keys(TERMS).filter((t) => resumeHasTerm(text, t));
}

export function matchKeywords(resumeText: string, jd: string): { hits: KeywordHit[]; matchPct: number } {
  const terms = extractJdTerms(jd);
  const hits = terms.map((t) => ({ ...t, found: resumeHasTerm(resumeText, t.term) }));
  const weight = (h: KeywordHit) => (h.nice ? 1 : 2) * Math.min(3, h.count);
  const total = hits.reduce((n, h) => n + weight(h), 0);
  const got = hits.reduce((n, h) => n + (h.found ? weight(h) : 0), 0);
  return { hits, matchPct: total === 0 ? 100 : Math.round((100 * got) / total) };
}

/* ----------------------------------- the score ----------------------------------- */

function check(id: string, label: string, weight: number, score: number, detail: string, fix?: string): AtsCheck {
  const s = +clamp01(score).toFixed(2);
  return { id, label, weight, score: s, detail, ...(s < 1 && fix ? { fix } : {}) };
}

export function scoreResume(text: string, opts: { jd?: string; doc?: ResumeDoc } = {}): AtsResult {
  const doc = opts.doc ?? parseResumeText(text);
  const bullets = allBullets(doc);
  const words = wordsIn(text);
  const checks: AtsCheck[] = [];

  // Contact
  const hasLink = doc.contact.links.length > 0;
  const contactParts = [Boolean(doc.contact.email), Boolean(doc.contact.phone), hasLink, Boolean(doc.contact.name)];
  const missingContact = [!doc.contact.name && "name on the first line", !doc.contact.email && "email", !doc.contact.phone && "phone", !hasLink && "LinkedIn or GitHub link"].filter(Boolean);
  checks.push(check("contact", "Contact details", 10, contactParts.filter(Boolean).length / 4, missingContact.length ? `Missing: ${missingContact.join(", ")}.` : "Name, email, phone and a profile link are all there.", `Add ${missingContact.join(", ")} at the very top, as plain text (not inside a header or image).`));

  // Sections
  const hasWork = doc.experience.length > 0;
  const hasProj = doc.projects.length > 0;
  const sec = [hasWork || hasProj, doc.education.length > 0, doc.skills.length > 0, Boolean(doc.summary) || hasWork];
  const secMissing = [!(hasWork || hasProj) && "Experience or Projects", !doc.education.length && "Education", !doc.skills.length && "Skills"].filter(Boolean);
  checks.push(check("sections", "Standard sections", 10, sec.filter(Boolean).length / 4, secMissing.length ? `Couldn't find: ${secMissing.join(", ")}.` : "Experience/Projects, Education and Skills are labelled in a way ATS software recognises.", `Use plain headings an ATS expects: “Experience”, “Projects”, “Education”, “Skills” (not “My journey” or “What I know”).`));

  // Length
  const pages = words / 500;
  const lenScore = words < 250 ? words / 250 : words <= 750 ? 1 : words <= 1000 ? 1 - (words - 750) / 500 : 0.4;
  checks.push(check("length", "Length", 8, lenScore, `${words} words, about ${pages.toFixed(1)} page${pages >= 1.5 ? "s" : ""}.`, words < 250 ? "Too thin: add projects, impact and skills until you reach roughly one full page." : "Too long: cut to one page (two only past ~8 years). Drop old, irrelevant or duplicate bullets."));

  // Bullets
  const firstWord = (b: string) => b.replace(/^[^A-Za-z]+/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const verbHits = bullets.filter((b) => ACTION_VERBS.has(firstWord(b.text))).length;
  checks.push(check("verbs", "Bullets start with action verbs", 12, bullets.length ? verbHits / bullets.length : 0, bullets.length ? `${pctText(verbHits, bullets.length)} bullets open with a strong verb.` : "No bullets found under Experience or Projects.", "Start every bullet with a verb like Built, Reduced, Led, Migrated, Shipped (not “Responsible for” or “Worked on”)."));
  const metricHits = bullets.filter((b) => METRIC.test(b.text)).length;
  checks.push(check("metrics", "Measurable impact", 12, bullets.length ? Math.min(1, metricHits / (bullets.length * 0.6)) : 0, bullets.length ? `${pctText(metricHits, bullets.length)} bullets contain a number.` : "No bullets to measure.", "Add a number to at least 60% of bullets: users, requests per second, % faster, ₹/$ saved, team size, test coverage."));
  const goodLen = bullets.filter((b) => { const n = wordsIn(b.text); return n >= 8 && n <= 30; }).length;
  checks.push(check("bullet-length", "Bullet length", 6, bullets.length ? goodLen / bullets.length : 0, bullets.length ? `${pctText(goodLen, bullets.length)} bullets are 8-30 words.` : "No bullets found.", "Keep bullets to one or two lines (8-30 words): what you did, how, and the result."));

  // Skills
  const sk = doc.skills.length;
  checks.push(check("skills", "Skills section", 8, sk === 0 ? 0 : sk < 8 ? sk / 8 : sk <= 35 ? 1 : 0.7, sk ? `${sk} skills listed.` : "No skills list found.", sk < 8 ? "List 10-25 concrete tools and technologies you can be asked about." : "Trim the skills list to what you can defend in an interview (under ~35)."));

  // Formatting
  const lines = text.split("\n");
  const wide = lines.filter((l) => /\t|\s{4,}\S/.test(l)).length;
  const pipes = lines.filter((l) => (l.match(/\|/g)?.length ?? 0) >= 3).length;
  const symbolLines = lines.filter((l) => SYMBOLS.test(l)).length;
  const shortRatio = lines.filter((l) => l.trim()).length ? lines.filter((l) => l.trim() && l.trim().length < 14 && !isBullet(l)).length / lines.filter((l) => l.trim()).length : 0;
  const risks = [wide > 3 && "columns or tables (text extracted in a scrambled order)", pipes > 2 && "table-like rows", symbolLines > 0 && "icons or special symbols", shortRatio > 0.35 && "many tiny fragments (a multi-column layout)"].filter(Boolean);
  checks.push(check("format", "ATS-safe formatting", 8, 1 - Math.min(1, risks.length * 0.34), risks.length ? `Risks: ${risks.join("; ")}.` : "Reads as clean, single-column text.", "Use a single-column layout with plain headings; avoid tables, text boxes, icons, photos and skill-rating bars."));

  // Dates
  const dated = [...doc.experience.map((e) => e.dates), ...doc.education.map((e) => e.dates)];
  const withDates = dated.filter((d) => d && (DATE_RANGE.test(d) || /\b(19|20)\d{2}\b/.test(d))).length;
  const monthStyle = (text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19|20)\d{2}/gi) ?? []).length;
  const numStyle = (text.match(/\b\d{1,2}\/(19|20)\d{2}\b/g) ?? []).length;
  const mixed = monthStyle > 0 && numStyle > 0;
  checks.push(check("dates", "Dates", 6, dated.length ? (withDates / dated.length) * (mixed ? 0.7 : 1) : 0.5, dated.length ? `${pctText(withDates, dated.length)} entries have a date${mixed ? "; formats are mixed" : ""}.` : "No dated entries found.", mixed ? "Use one date format everywhere, e.g. “Jun 2023 – Present”." : "Give every job and degree a date range such as “Jun 2023 – Present”."));

  // Weak language
  const weak = WEAK_PHRASES.filter(([re]) => re.test(text));
  checks.push(check("language", "Strong language", 5, 1 - Math.min(1, weak.length * 0.25), weak.length ? `Found: ${weak.map(([, why]) => why).join("; ")}.` : "No filler phrases or buzzwords found.", "Replace duties and buzzwords with what you built and what changed."));

  // JD match
  let keywords: AtsResult["keywords"] = null;
  const jd = opts.jd?.trim();
  if (jd && jd.length > 40) {
    keywords = matchKeywords(text, jd);
    const miss = keywords.hits.filter((h) => !h.found && !h.nice).map((h) => h.term);
    checks.push(check("keywords", "Job description match", 28, keywords.matchPct / 100, `${keywords.matchPct}% of the keywords this job asks for appear in your resume.`, miss.length ? `Work in the real ones you have: ${miss.slice(0, 6).join(", ")}.` : "Add the nice-to-have terms you genuinely have."));
  }

  const totalWeight = checks.reduce((n, c) => n + c.weight, 0);
  const score = Math.round((100 * checks.reduce((n, c) => n + c.weight * c.score, 0)) / totalWeight);
  const verdict = score >= 80 ? "strong" : score >= 65 ? "good" : score >= 50 ? "needs work" : "weak";
  const lost = (c: AtsCheck) => c.weight * (1 - c.score);
  const topFixes = checks
    .filter((c) => c.fix && c.score < 0.95)
    .toSorted((a, b) => lost(b) - lost(a))
    .slice(0, 5)
    .map((c) => c.fix!);

  return { score, verdict, checks, keywords, missing: keywords?.hits.filter((h) => !h.found).map((h) => h.term) ?? [], topFixes };
}
