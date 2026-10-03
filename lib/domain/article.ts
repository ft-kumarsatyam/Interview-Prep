/** Stored article bodies are capped so one huge post can't bloat the 512 MB Atlas M0. */
export const CONTENT_MAX = 80_000;
/** Feed bodies shorter than this (in words) are teasers; the reader extracts the page instead. */
export const FULL_TEXT_MIN_WORDS = 250;
export const WORDS_PER_MINUTE = 230;

export type ContentStatus = "full" | "extracted" | "failed" | "headline";

/** Feed hosts whose links are redirects that only resolve in a browser. */
const HEADLINE_ONLY_HOSTS = new Set(["news.google.com"]);

export function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

/** Markdown without code fences, images, link targets and syntax, for counting and matching. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(wordCount(plainText(markdown)) / WORDS_PER_MINUTE));
}

/** Cut at the last paragraph break before the cap so markdown blocks stay intact. */
export function capContent(markdown: string, max = CONTENT_MAX): string {
  const text = markdown.trim();
  if (text.length <= max) return text;
  const cut = text.lastIndexOf("\n\n", max);
  return `${text.slice(0, cut > max / 2 ? cut : max).trimEnd()}\n\n*…article truncated. Open the original for the rest.*`;
}

export function isHeadlineOnly(url: string): boolean {
  try {
    return HEADLINE_ONLY_HOSTS.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

export interface ArticleTag {
  id: string;
  label: string;
  pattern: RegExp;
}

/** Keyword rules for tag chips and System Design related reading. Order is display order. */
export const ARTICLE_TAGS: readonly ArticleTag[] = [
  { id: "system-design", label: "System design", pattern: /\bsystem design\b|\barchitectur(e|al)\b|\bscal(ability|ing|able)\b|\bhigh availability\b/i },
  { id: "distributed", label: "Distributed systems", pattern: /\bdistributed\b|\bconsensus\b|\braft\b|\bpaxos\b|\breplicat(ion|ed|as?)\b|\bpartition(s|ing|ed)?\b|\bconsisten(cy|t hashing)\b/i },
  { id: "databases", label: "Databases", pattern: /\bdatabases?\b|\bpostgres(ql)?\b|\bmysql\b|\bmongodb\b|\bsql\b|\bindex(es|ing)\b|\bshard(s|ing)?\b|\bdynamodb\b|\bcassandra\b/i },
  { id: "caching", label: "Caching", pattern: /\bcach(e|es|ing)\b|\bredis\b|\bmemcached\b|\bcdn\b/i },
  { id: "queues", label: "Kafka & queues", pattern: /\bkafka\b|\bqueues?\b|\bpub\/?sub\b|\bevent[- ]driven\b|\bstreaming\b|\brabbitmq\b|\bsqs\b/i },
  { id: "infra", label: "Cloud & infra", pattern: /\bkubernetes\b|\bk8s\b|\bdocker\b|\bserverless\b|\baws\b|\bgcp\b|\bazure\b|\bterraform\b|\binfrastructure\b/i },
  { id: "reliability", label: "Reliability", pattern: /\boutage\b|\bincident\b|\bpostmortem\b|\bpost-mortem\b|\bobservability\b|\bslo\b|\blatency\b|\bresilien(ce|t)\b|\brate limit/i },
  { id: "security", label: "Security", pattern: /\bsecurity\b|\bvulnerabilit(y|ies)\b|\bauth(entication|orization)?\b|\bencrypt(ion|ed)\b|\bcve-\d|\bzero[- ]day\b|\bexploit\b/i },
  { id: "llm", label: "AI, LLMs & agents", pattern: /\bllms?\b|\bai\b|\bartificial intelligence\b|\bmachine learning\b|\bgpt-?\d|\bgemini\b|\bclaude\b|\bagents?\b|\brag\b|\bembeddings?\b|\bfine-?tun|\btransformer|\binference\b|\bprompt/i },
  { id: "javascript", label: "JS & Node", pattern: /\bjavascript\b|\btypescript\b|\bnode(\.js)?\b|\breact\b|\bv8\b|\bdeno\b|\bbun\b|\bnext\.js\b/i },
  { id: "career", label: "Interviews & career", pattern: /\binterview(s|ing)?\b|\bcareer\b|\bhiring\b|\bpromotion\b|\blayoffs?\b|\bsalar(y|ies)\b/i },
  { id: "dsa", label: "DSA", pattern: /\bdsa\b|\bdata structures?\b|\balgorithms?\b|\bleetcode\b|\bdynamic programming\b|\bbinary (search|tree)\b|\bgraphs?\b|\blinked lists?\b|\btwo pointers\b|\bsliding window\b|\bbacktracking\b/i },
  { id: "coding", label: "Coding", pattern: /\bcoding\b|\bprogramming\b|\bpython\b|\bjava\b|\bc\+\+|\brust\b|\bgolang\b|\brefactor(ing)?\b|\bcode review\b|\bclean code\b|\bdesign patterns?\b/i },
  { id: "behavioral", label: "Behavioural & habits", pattern: /\bbehaviou?ral\b|\bstar method\b|\bsoft skills?\b|\bleadership\b|\bhabits?\b|\bproductivity\b|\bcommunication\b|\bmentorship\b|\bburnout\b/i },
  { id: "science", label: "Science", pattern: /\bscien(ce|tific|tists?)\b|\bphysics\b|\bquantum\b|\bneuroscience\b|\bastronom(y|ers?)\b|\bbiolog(y|ical)\b|\bchemistry\b|\bnasa\b/i },
  { id: "quiz", label: "Quizzes & puzzles", pattern: /\bquiz(zes)?\b|\bpuzzles?\b|\btrivia\b|\bbrain ?teasers?\b/i },
];

export const tagLabel = new Map(ARTICLE_TAGS.map((t) => [t.id, t.label]));

/**
 * Tags from the title and the start of the body. The title alone is enough
 * for a tag; the body needs two hits, so a passing mention doesn't count.
 */
export function classifyTags(title: string, body = "", max = 4): string[] {
  const head = plainText(body).slice(0, 6000);
  const out: string[] = [];
  for (const tag of ARTICLE_TAGS) {
    const inTitle = tag.pattern.test(title);
    const global = new RegExp(tag.pattern.source, "gi");
    const bodyHits = head.match(global)?.length ?? 0;
    if (inTitle || bodyHits >= 2) out.push(tag.id);
    if (out.length === max) break;
  }
  return out;
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) {
    const [a, b, c] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

/**
 * Syntactic half of the SSRF guard: http(s) on the default port, no
 * credentials, no bare or private IP literals, no internal-looking hosts.
 * The extractor also checks every DNS answer with `isPrivateAddress`.
 */
export function isSafeUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || u.port) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(".") && !host.includes(":")) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^[\d.]+$/.test(host) || host.includes(":")) return !isPrivateAddress(host);
  return true;
}

/** Keep order, but at most `perSource` items from any one source, so one busy blog can't fill a rail. */
export function diversify<T extends { sourceId: string }>(items: readonly T[], perSource: number, limit: number): T[] {
  const seen = new Map<string, number>();
  const out: T[] = [];
  for (const item of items) {
    const n = seen.get(item.sourceId) ?? 0;
    if (n >= perSource) continue;
    seen.set(item.sourceId, n + 1);
    out.push(item);
    if (out.length === limit) break;
  }
  return out;
}

/** "Full article" picks for the dashboard and the System design rail. */
export function isLongRead(a: { contentStatus?: string | null; readingMinutes?: number | null }, minMinutes = 5): boolean {
  return (a.contentStatus === "full" || a.contentStatus === "extracted") && (a.readingMinutes ?? 0) >= minMinutes;
}
