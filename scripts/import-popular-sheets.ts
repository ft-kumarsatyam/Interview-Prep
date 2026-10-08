/**
 * Imports four public DSA sheets into data/dsa-popular-sheets.json: Love Babbar 450, Apna College (Shradha) 375,
 * Arsh Goyal and Fraz. Each comes from its public source list, whose URL is kept on the sheet.
 *
 *   npm run import:sheets                 # download the public sources
 *   npm run import:sheets -- --from DIR   # use saved copies: babbar.json, apna.xlsx, arsh.csv, fraz.csv
 *
 * Contacts raw.githubusercontent.com and docs.google.com (public CSV/XLSX export) only, never leetcode.com.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { companyDataset, extraProblems, problems, type ContentProblem } from "@/core/content";
import { leetcodeSlugOf, localSlugByLeetcode } from "@/modules/dsa/domain/company-tags";
import { externalCatalogueSchema, matchExternalQuestion, type ExternalLink, type ExternalQuestion, type ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { matchCompanyNames, parseApnaGrid, parseArshCsv, parseBabbarJson, parseFrazCsv, titleFromUrl, type Grid, type ImportedItem } from "@/modules/dsa/domain/sheet-import";

const OUT = path.join(process.cwd(), "data", "dsa-popular-sheets.json");
const sheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;
const exportUrl = (id: string, format: "csv" | "xlsx") => `https://docs.google.com/spreadsheets/d/${id}/export?format=${format}`;

interface Source {
  file: string;
  download: string;
  meta: Omit<ExternalSheet, "questions" | "sections" | "updatedAt" | "practiceProblemCount" | "topicCount">;
  prefix: string;
  parse: (dir: string) => Promise<ImportedItem[]>;
}

const APNA = "1hXserPuxVoWMG9Hs7y8wVdRCJTcj3xMBAEYUOXQ5Xag";
const ARSH = "1MGVBJ8HkRbCnU6EQASjJKCqQE8BWng4qgL0n3vCVOxE";
const FRAZ = "1-wKcV99KtO91dXdPkwmXGTdtyxAfk1mbPXQg81R9sFE";

const SOURCES: Source[] = [
  {
    file: "babbar.json",
    download: "https://raw.githubusercontent.com/AsishRaju/450-DSA/master/450DSA.json",
    prefix: "lb450",
    meta: {
      id: "love-babbar-450",
      title: "Love Babbar 450",
      source: "Love Babbar (DSA Cracker Sheet)",
      sourceUrl: "https://drive.google.com/file/d/1FMdN_OCfOI0iAeDlqswCiC2DZzD4nPsb/view",
      sourceSnapshot: "https://github.com/AsishRaju/450-DSA",
      description: "Love Babbar's topic-wise DSA Cracker sheet (mostly GeeksforGeeks problems). The source has no difficulty column, so difficulty comes from the matching PrepOS or LeetCode problem, else Medium.",
    },
    parse: async (dir) => parseBabbarJson(JSON.parse((await readFile(path.join(dir, "babbar.json"), "utf8")).replace(/^\uFEFF/, ""))),
  },
  {
    file: "apna.xlsx",
    download: exportUrl(APNA, "xlsx"),
    prefix: "apna",
    meta: {
      id: "apna-college-375",
      title: "Apna College 375",
      source: "Apna College (Shradha Khapra)",
      sourceUrl: sheetUrl(APNA),
      description: "The 375-question DSA sheet by Shradha Khapra (Apna College), with the companies and remarks the sheet lists. Difficulty is read from the sheet's colour legend.",
    },
    parse: async (dir) => parseApnaGrid(await readXlsxGrid(path.join(dir, "apna.xlsx"))),
  },
  {
    file: "arsh.csv",
    download: exportUrl(ARSH, "csv"),
    prefix: "arsh",
    meta: {
      id: "arsh-goyal",
      title: "Arsh Goyal",
      source: "Arsh Goyal (#CrackYourPlacement)",
      sourceUrl: sheetUrl(ARSH),
      description: "Arsh Goyal's 45-day DSA sheet, grouped by topic with the sheet's own difficulty labels.",
    },
    parse: async (dir) => parseArshCsv(await readFile(path.join(dir, "arsh.csv"), "utf8")),
  },
  {
    file: "fraz.csv",
    download: exportUrl(FRAZ, "csv"),
    prefix: "fraz",
    meta: {
      id: "fraz-250",
      title: "Fraz 250",
      source: "Mohammad Fraz (Lead Coding)",
      sourceUrl: sheetUrl(FRAZ),
      description: "Fraz's LeetCode-first DSA sheet by topic and difficulty, with his editorial video where the sheet links one.",
    },
    parse: async (dir) => parseFrazCsv(await readFile(path.join(dir, "fraz.csv"), "utf8")),
  },
];

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (text: string) =>
  text.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e: string) => (e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" ? `0${e.slice(1)}` : e.slice(1))) : XML_ENTITIES[e]));

/** The first worksheet of an XLSX file as rows of cells keyed by column letter, with fill ids and hyperlinks. */
async function readXlsxGrid(file: string): Promise<Grid> {
  const dir = await mkdtemp(path.join(tmpdir(), "xlsx-"));
  execFileSync("unzip", ["-q", "-o", file, "-d", dir]);
  const read = (p: string) => readFile(path.join(dir, p), "utf8").catch(() => "");
  const [shared, styles, sheet, rels] = await Promise.all([read("xl/sharedStrings.xml"), read("xl/styles.xml"), read("xl/worksheets/sheet1.xml"), read("xl/worksheets/_rels/sheet1.xml.rels")]);
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unescapeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const cellXfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? "";
  const fills = [...cellXfs.matchAll(/<xf [^>]*?fillId="(\d+)"/g)].map((m) => Number(m[1]));
  const targets = new Map([...rels.matchAll(/<Relationship [^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)].map((m) => [m[1], unescapeXml(m[2])]));
  const links = new Map([...sheet.matchAll(/<hyperlink [^>]*?r:id="([^"]+)"[^>]*?ref="([A-Z]+\d+)"/g)].map((m) => [m[2], targets.get(m[1])]));
  const grid: Grid = [];
  for (const row of sheet.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: Grid[number] = {};
    for (const c of row[1].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, num, attrs, body = ""] = c;
      const style = /s="(\d+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      const text = / t="s"/.test(attrs) ? (strings[Number(value)] ?? "") : unescapeXml(value ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] ?? "");
      const link = links.get(`${col}${num}`);
      if (!text && !link) continue;
      cells[col] = { text, ...(style ? { fill: fills[Number(style)] } : {}), ...(link ? { link } : {}) };
    }
    grid.push(cells);
  }
  return grid;
}

const allProblems: ContentProblem[] = [...problems, ...extraProblems];
const bySlug = new Map(allProblems.map((p) => [p.slug, p]));
const byLeetcode = localSlugByLeetcode(allProblems);
const knownCompanies = companyDataset.companies.map((c) => c.name);
const datasetTitle = (slug: string) => companyDataset.questions[slug]?.title;

function platformOf(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "leetcode.com") return "LeetCode";
  if (host.endsWith("geeksforgeeks.org")) return "GfG";
  if (host === "spoj.com") return "SPOJ";
  return host.split(".")[0].replace(/^\w/, (ch) => ch.toUpperCase());
}

function toQuestion(item: ImportedItem, source: Source, order: number, updatedAt: string): ExternalQuestion {
  const lc = leetcodeSlugOf(item.url) ?? undefined;
  const title = item.title || titleFromUrl(item.url, datasetTitle);
  const viaLeetcode = lc ? (byLeetcode.get(lc) ?? (bySlug.has(lc) ? lc : undefined)) : undefined;
  const localSlug = viaLeetcode ?? (lc ? undefined : matchExternalQuestion({ title }, allProblems));
  const local = localSlug ? bySlug.get(localSlug) : undefined;
  const difficulty = item.difficulty ?? local?.difficulty ?? (lc ? companyDataset.questions[lc]?.difficulty : undefined) ?? "Medium";
  const platform = platformOf(item.url);
  const links: ExternalLink[] = [{ kind: "practice", label: platform, url: item.url, scope: "item" }];
  if (item.video) links.push({ kind: "video", label: "Editorial video", url: item.video, scope: "item" });
  const companies = (item.companies ?? []).flatMap((text) => matchCompanyNames(text, knownCompanies)).map((company) => ({
    company,
    confidence: "medium" as const,
    sourceUrl: source.meta.sourceUrl,
    sourceKind: "other" as const,
    lastVerified: updatedAt,
  }));
  return {
    id: `${source.prefix}-${String(order).padStart(3, "0")}`,
    sheetId: source.meta.id,
    order,
    section: item.section,
    category: platform,
    difficulty,
    title,
    ...(local ? { localSlug: local.slug, ...(local.leetcodeId ? { leetcodeId: local.leetcodeId } : {}) } : {}),
    links,
    companies,
    ...(item.remark ? { notes: item.remark } : {}),
    sourceCoverage: local ? "exact" : "partial",
  };
}

/** One question per line, so a re-import produces a readable diff. */
function serialise(catalogue: { generatedAt: string; source: string; sheets: ExternalSheet[] }): string {
  const sheets = catalogue.sheets.map(({ questions, ...meta }) => {
    const head = JSON.stringify(meta, null, 2).replace(/\n}$/, "").replace(/\n/g, "\n    ");
    return `    ${head},\n      "questions": [\n${questions.map((q) => `        ${JSON.stringify(q)}`).join(",\n")}\n      ]\n    }`;
  });
  return `{\n  "generatedAt": ${JSON.stringify(catalogue.generatedAt)},\n  "source": ${JSON.stringify(catalogue.source)},\n  "sheets": [\n${sheets.join(",\n")}\n  ]\n}\n`;
}

async function download(dir: string) {
  for (const source of SOURCES) {
    const res = await fetch(source.download, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
    if (!res.ok) throw new Error(`${source.meta.id}: ${source.download} returned ${res.status}`);
    await writeFile(path.join(dir, source.file), Buffer.from(await res.arrayBuffer()));
  }
}

async function main() {
  const fromIndex = process.argv.indexOf("--from");
  const dir = fromIndex > 0 ? path.resolve(process.argv[fromIndex + 1]) : await mkdtemp(path.join(tmpdir(), "dsa-sheets-"));
  if (fromIndex < 0) await download(dir);
  const updatedAt = new Date().toISOString().slice(0, 10);
  const sheets: ExternalSheet[] = [];
  for (const source of SOURCES) {
    const items = await source.parse(dir);
    if (items.length < 100) throw new Error(`${source.meta.id}: only ${items.length} questions parsed; the source layout probably changed`);
    const questions = items.map((item, i) => toQuestion(item, source, i + 1, updatedAt));
    const sections = [...new Set(questions.map((q) => q.section))];
    sheets.push({ ...source.meta, updatedAt, topicCount: sections.length, practiceProblemCount: questions.length, sections, questions });
    const linked = questions.filter((q) => q.localSlug).length;
    console.log(`${source.meta.title}: ${questions.length} questions in ${sections.length} sections, ${linked} open in PrepOS`);
  }
  const catalogue = externalCatalogueSchema.parse({ generatedAt: updatedAt, source: "Public DSA sheets (see each sheet's sourceUrl)", sheets });
  await writeFile(OUT, serialise(catalogue));
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
