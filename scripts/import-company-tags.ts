/**
 * Imports company-wise LeetCode tags from the public GitHub dataset into data/dsa-company-tags.json.
 *
 *   npm run import:companies                 # download the repo tarball from GitHub
 *   npm run import:companies -- --from DIR   # use an already-extracted copy
 *
 * Only github.com / codeload.github.com is contacted, never leetcode.com.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildCompanyDataset, CSV_WINDOW_FILES, type CompanyFiles } from "@/modules/dsa/domain/company-csv";
import { companyDatasetSchema, type CompanyDataset } from "@/modules/dsa/domain/company-tags";

const REPO = "liquidslr/leetcode-company-wise-problems";
const TARBALL = `https://codeload.github.com/${REPO}/tar.gz/main`;
const DATASET_DATE = "2025-06-20";
const OUT = path.join(process.cwd(), "data", "dsa-company-tags.json");
const MAX_BYTES = 1_500_000;

async function download(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "company-tags-"));
  const res = await fetch(TARBALL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const archive = path.join(dir, "repo.tgz");
  await writeFile(archive, Buffer.from(await res.arrayBuffer()));
  execFileSync("tar", ["-xzf", archive, "-C", dir]);
  const [root] = (await readdir(dir)).filter((name) => name !== "repo.tgz");
  return path.join(dir, root);
}

async function readCompanies(root: string): Promise<CompanyFiles[]> {
  const out: CompanyFiles[] = [];
  for (const folder of await readdir(root)) {
    const full = path.join(root, folder);
    if (folder.startsWith(".") || !(await stat(full)).isDirectory()) continue;
    const files: Record<string, string> = {};
    for (const file of await readdir(full)) {
      if (file in CSV_WINDOW_FILES) files[file] = await readFile(path.join(full, file), "utf8");
    }
    if (Object.keys(files).length) out.push({ folder, files });
  }
  return out;
}

/** One company or question per line, so a re-import produces a readable diff. */
function serialise(dataset: CompanyDataset): string {
  const lines = [
    "{",
    `  "source": ${JSON.stringify(dataset.source)},`,
    `  "topics": ${JSON.stringify(dataset.topics)},`,
    `  "companies": [`,
    dataset.companies.map((c) => `    ${JSON.stringify(c)}`).join(",\n"),
    "  ],",
    `  "questions": {`,
    Object.entries(dataset.questions).map(([slug, q]) => `    ${JSON.stringify(slug)}: ${JSON.stringify(q)}`).join(",\n"),
    "  }",
    "}",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const fromIndex = process.argv.indexOf("--from");
  const local = fromIndex > 0 ? process.argv[fromIndex + 1] : undefined;
  const root = local ? path.resolve(local) : await download();
  try {
    const companies = await readCompanies(root);
    const dataset = companyDatasetSchema.parse(
      buildCompanyDataset(companies, {
        name: "LeetCode company-wise problems (community dataset)",
        url: `https://github.com/${REPO}`,
        datasetDate: DATASET_DATE,
        importedAt: new Date().toISOString().slice(0, 10),
        note: "Community-collected LeetCode company tags. They show what candidates reported, not a company's official question bank.",
      }),
    );
    const text = serialise(dataset);
    if (Buffer.byteLength(text) > MAX_BYTES) throw new Error(`dataset is ${Buffer.byteLength(text)} bytes, over the ${MAX_BYTES} budget`);
    await writeFile(OUT, text);
    console.log(`wrote ${dataset.companies.length} companies, ${Object.keys(dataset.questions).length} questions, ${Buffer.byteLength(text)} bytes`);
  } finally {
    if (!local) await rm(path.dirname(root), { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
