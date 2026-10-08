export const DSA_TABS = ["practice", "topics", "patterns", "sheets", "companies", "references"] as const;
export type DsaTab = (typeof DSA_TABS)[number];

/** The DSA page's view choices. They live in the URL so going back to the page shows the same tab, section and list. */
export interface DsaViewState {
  tab: DsaTab;
  /** Pattern cheat sheet id. */
  cheat: string;
  /** Ordered sheet id, section, and whether it is browsed by topic or by company. */
  sheet: string;
  section: string;
  sview: "topic" | "company";
  scompany: string;
  /** Pattern filter on a ladder sheet. */
  spattern: string;
  /** Company on the Companies tab. */
  company: string;
  /** Problem groups opened by hand on the Practice tab. */
  open: string[] | null;
}

/** URLSearchParams as the record shape `searchParams` uses: repeated keys become arrays. */
export function paramsRecord(params: Pick<URLSearchParams, "forEach">): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const prev = out[key];
    out[key] = prev === undefined ? value : [...(Array.isArray(prev) ? prev : [prev]), value];
  });
  return out;
}

const one = (value: string | string[] | undefined, max = 120) => (typeof value === "string" ? value.slice(0, max) : "");

/** Filter keys of the by-topic browser: links such as /dsa?pattern=Trees or /dsa?track=sql open that tab. */
const TOPIC_BROWSER_KEYS = ["track", "pattern", "list", "q", "difficulty", "status", "view", "sort", "open"];

export function parseDsaView(sp: Record<string, string | string[] | undefined>): DsaViewState {
  const tab = one(sp.tab);
  const open = sp.open === undefined ? null : (Array.isArray(sp.open) ? sp.open : [sp.open]).slice(0, 60).map((key) => key.slice(0, 160));
  const fallback: DsaTab = TOPIC_BROWSER_KEYS.some((key) => sp[key] !== undefined) ? "topics" : "practice";
  return {
    tab: (DSA_TABS as readonly string[]).includes(tab) ? (tab as DsaTab) : fallback,
    cheat: one(sp.cheat, 40),
    sheet: one(sp.sheet, 40),
    section: one(sp.section),
    sview: sp.sview === "company" ? "company" : "topic",
    scompany: one(sp.scompany, 80),
    spattern: one(sp.spattern, 80),
    company: one(sp.company, 80),
    open,
  };
}
