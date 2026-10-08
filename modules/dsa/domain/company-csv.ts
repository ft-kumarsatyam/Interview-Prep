import { leetcodeSlugOf, type CompanyDataset, type CompanyRegion, type CompanyWindow } from "@/modules/dsa/domain/company-tags";

/** The dataset's five files per company, mapped to the windows PrepOS keeps ("More Than Six Months" is folded into "all"). */
export const CSV_WINDOW_FILES: Record<string, CompanyWindow | null> = {
  "1. Thirty Days.csv": "d30",
  "2. Three Months.csv": "d90",
  "3. Six Months.csv": "d180",
  "4. More Than Six Months.csv": null,
  "5. All.csv": "all",
};

export interface CsvRow {
  difficulty: "Easy" | "Medium" | "Hard";
  title: string;
  frequency: number;
  slug: string;
  topics: string[];
}

/** Splits one CSV line, honouring double-quoted fields and escaped quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

const DIFFICULTY: Record<string, CsvRow["difficulty"]> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

/** Parses one company CSV (Difficulty, Title, Frequency, Acceptance Rate, Link, Topics). Bad rows are skipped. */
export function parseCompanyCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const [iDiff, iTitle, iFreq, iLink, iTopics] = [col("difficulty"), col("title"), col("frequency"), col("link"), col("topics")];
  if ([iDiff, iTitle, iFreq, iLink].some((i) => i < 0)) return [];
  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const difficulty = DIFFICULTY[cells[iDiff]?.trim().toUpperCase() ?? ""];
    const slug = leetcodeSlugOf(cells[iLink] ?? "");
    const title = cells[iTitle]?.trim();
    if (!difficulty || !slug || !title) continue;
    const frequency = Math.round(Number(cells[iFreq]) * 10) / 10;
    const topics = iTopics >= 0 ? (cells[iTopics] ?? "").split(",").map((t) => t.trim()).filter(Boolean) : [];
    rows.push({ difficulty, title, frequency: Number.isFinite(frequency) ? frequency : 0, slug, topics });
  }
  return rows;
}

const NAME_OVERRIDES: Record<string, string> = {
  tcs: "TCS",
  oyo: "OYO",
  jio: "Jio",
  redbus: "redBus",
  thoughtspot: "ThoughtSpot",
  carwale: "CarWale",
  fourkites: "FourKites",
  opentext: "OpenText",
  smartnews: "SmartNews",
  peak6: "PEAK6",
  "DP world": "DP World",
  "Analytics quotient": "Analytics Quotient",
};

/** Cleans the folder name: known spellings first, then title case for all-lowercase names. */
export function displayCompanyName(folder: string): string {
  const name = folder.trim();
  if (NAME_OVERRIDES[name]) return NAME_OVERRIDES[name];
  if (name === name.toLowerCase()) return name.replace(/\b\w/g, (c) => c.toUpperCase());
  return name;
}

export function companySlug(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Companies founded and headquartered in India, by dataset folder name (case-insensitive). */
export const INDIAN_COMPANIES = new Set(
  [
    "Accolite", "Acko", "Airtel", "Analytics quotient", "BharatPe", "blinkit", "CARS24", "carwale", "Cashfree", "CEDCOSS",
    "Cleartrip", "Coforge", "CRED", "CureFit", "Darwinbox", "Delhivery", "DeltaX", "Devtron", "Directi", "Dream11", "Druva",
    "Dunzo", "Edelweiss Group", "Flipkart", "Freecharge", "FreshWorks", "Gameskraft", "Graviton", "Groww", "HashedIn", "HCL",
    "Hiver", "Hotstar", "IIT Bombay", "INDmoney", "Info Edge", "Infosys", "InMobi", "jio", "josh technology", "Juspay",
    "Larsen & Toubro", "Lendingkart Technologies", "Lenskart", "Licious", "LTI", "MakeMyTrip", "Media.net", "Meesho",
    "Mindtickle", "MindTree", "Mitsogo", "Moengage", "Mountblue", "Myntra", "National Payments Corporation of India", "Navi",
    "NinjaCart", "Nykaa", "Ola Cabs", "oyo", "Paytm", "PayU", "persistent systems", "PhonePe", "QBurst", "razorpay", "redbus",
    "ShareChat", "Sigmoid", "Slice", "Snapdeal", "Swiggy", "tcs", "Tech Mahindra", "Tejas Networks", "Tiger Analytics",
    "Urban Company", "WinZO", "Wipro", "Wissen Technology", "Zepto", "Zeta", "zeta suite", "Zluri", "Zoho", "Zomato", "Zopsmart",
  ].map((name) => name.toLowerCase()),
);

export function regionOf(folder: string): CompanyRegion {
  return INDIAN_COMPANIES.has(folder.trim().toLowerCase()) ? "india" : "global";
}

const WINDOW_INDEX: Record<CompanyWindow, number> = { d30: 0, d90: 1, d180: 2, all: 3 };

export interface CompanyFiles {
  folder: string;
  /** Raw CSV text by file name. */
  files: Record<string, string>;
}

/** Builds the compact dataset: one entry per company and per LeetCode slug, frequencies per window (0 = absent). */
export function buildCompanyDataset(input: readonly CompanyFiles[], source: CompanyDataset["source"]): CompanyDataset {
  const topics: string[] = [];
  const topicIndex = new Map<string, number>();
  const topicId = (name: string) => {
    let id = topicIndex.get(name);
    if (id === undefined) {
      id = topics.length;
      topics.push(name);
      topicIndex.set(name, id);
    }
    return id;
  };
  const sorted = input.toSorted((a, b) => displayCompanyName(a.folder).localeCompare(displayCompanyName(b.folder)));
  const companies: CompanyDataset["companies"] = [];
  const questions: CompanyDataset["questions"] = {};
  const seenSlugs = new Set<string>();

  for (const entry of sorted) {
    const name = displayCompanyName(entry.folder);
    const slug = companySlug(name);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const ci = companies.length;
    const perSlug = new Map<string, [number, number, number, number]>();
    for (const [file, text] of Object.entries(entry.files)) {
      const window = CSV_WINDOW_FILES[file];
      if (!window) continue;
      for (const row of parseCompanyCsv(text)) {
        const freqs = perSlug.get(row.slug) ?? [0, 0, 0, 0];
        freqs[WINDOW_INDEX[window]] = Math.max(row.frequency, 0.1);
        perSlug.set(row.slug, freqs);
        questions[row.slug] ??= { title: row.title, difficulty: row.difficulty, topics: row.topics.map(topicId), tags: [] };
      }
    }
    if (perSlug.size === 0) continue;
    // Rows from a window file but missing from "All" still count as all-time.
    for (const freqs of perSlug.values()) if (!freqs[3]) freqs[3] = Math.max(freqs[0], freqs[1], freqs[2]);
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    for (const [qSlug, freqs] of perSlug) {
      freqs.forEach((f, i) => { if (f > 0) counts[i]++; });
      questions[qSlug].tags.push([ci, ...freqs]);
    }
    companies.push({ slug, name, region: regionOf(entry.folder), counts });
  }
  for (const q of Object.values(questions)) q.tags.sort((a, b) => b[4] - a[4] || a[0] - b[0]);
  const orderedQuestions = Object.fromEntries(Object.entries(questions).toSorted(([a], [b]) => a.localeCompare(b)));
  return { source, topics, companies, questions: orderedQuestions };
}
