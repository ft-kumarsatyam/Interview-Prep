/**
 * Points every Striver A2Z, Array Learning and GFG 160 row at the PrepOS problem that opens it in-app (see
 * scripts/dsa-ladders/a2z-resolve.ts) and rewrites data/dsa-external.json. Run after generate-dsa-extras.ts and
 * generate-dsa-testcases.ts.
 *
 *   node --import tsx scripts/link-a2z-local.ts            # write
 *   node --import tsx scripts/link-a2z-local.ts --report   # list rows that still don't open in-app
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { problemBySlug } from "@/core/content";
import { externalCatalogueSchema, type ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";
import { hasJudge, leetcodeSlugOf, resolveLocalSlug, tufSlugOf } from "./dsa-ladders/a2z-resolve";

const FILE = path.join(process.cwd(), "data", "dsa-external.json");
const report = process.argv.includes("--report");
const catalogue = externalCatalogueSchema.parse(JSON.parse(readFileSync(FILE, "utf8")));

const missing: string[] = [];
const noJudge: string[] = [];
let linked = 0;

function link(question: ExternalQuestion): ExternalQuestion {
  const slug = resolveLocalSlug(question);
  if (!slug) {
    // GFG 160 rows without a LeetCode twin keep their GFG links; only A2Z-derived sheets must open in-app.
    if (question.sheetId !== "gfg-160") missing.push(`${question.id}\t${question.section}\t${question.title}\t${leetcodeSlugOf(question) ? `lc:${leetcodeSlugOf(question)}` : `tuf:${tufSlugOf(question) ?? "-"}`}`);
    if (question.sheetId === "gfg-160" && question.localSlug && problemBySlug.has(question.localSlug)) return question;
    const rest = { ...question };
    delete rest.localSlug;
    return rest;
  }
  if (!hasJudge(slug)) noJudge.push(`${question.id}\t${slug}`);
  linked += 1;
  const problem = problemBySlug.get(slug)!;
  return {
    ...question,
    localSlug: slug,
    ...(problem.leetcodeId ? { leetcodeId: problem.leetcodeId } : {}),
    ...(question.sheetId === "gfg-160" ? {} : { difficulty: problem.difficulty }),
  };
}

const sheets = catalogue.sheets.map((sheet) => ({ ...sheet, questions: sheet.questions.map(link) }));

if (report || missing.length || noJudge.length) {
  if (missing.length) console.log(`Rows with no PrepOS problem (${missing.length}):\n${missing.join("\n")}`);
  if (noJudge.length) console.log(`Rows whose problem has no judge (${noJudge.length}):\n${noJudge.join("\n")}`);
}
console.log(`Linked ${linked} rows.`);
if (!report) {
  const out = externalCatalogueSchema.parse({ ...catalogue, sheets });
  writeFileSync(FILE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), FILE)}.`);
}
