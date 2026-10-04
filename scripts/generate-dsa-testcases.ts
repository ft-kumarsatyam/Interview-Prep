/**
 * Builds data/dsa-testcases.json for the in-app DSA runner. Problems are authored as specs in
 * scripts/dsa-testcases/specs/*.ts; `expected` values are never typed by hand, they come from running each
 * spec's reference solution in node:vm and are cross-checked against an independent brute force plus 200
 * seeded random inputs (see scripts/dsa-testcases/build.ts). Any disagreement or lint failure aborts the
 * run without touching the data file.
 *
 *   node --import tsx scripts/generate-dsa-testcases.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { problemBySlug } from "@/core/content";
import { buildEntry, type TestcaseEntryV2 } from "./dsa-testcases/build";
import { ALL_SPECS } from "./dsa-testcases/specs";

const OUT = path.join(process.cwd(), "data", "dsa-testcases.json");

const out: Record<string, TestcaseEntryV2> = {};
let failed = false;
for (const spec of ALL_SPECS) {
  if (out[spec.slug]) {
    console.error(`${spec.slug}: defined twice`);
    failed = true;
    continue;
  }
  const { entry, errors } = buildEntry(spec, { slugExists: problemBySlug.has(spec.slug) });
  if (errors.length) {
    failed = true;
    console.error(`\n${spec.slug}:`);
    for (const e of errors) console.error(`  - ${e}`);
    continue;
  }
  out[spec.slug] = entry;
}

if (failed) {
  console.error("\nNot written: fix the problems above.");
  process.exit(1);
}
/** One case per line keeps the file reviewable (large inputs would otherwise span thousands of lines). */
function serialise(entries: Record<string, TestcaseEntryV2>): string {
  const blocks = Object.entries(entries).map(([slug, { cases, hints, ...rest }]) => {
    const head = JSON.stringify(rest, null, 2).replace(/^\{\n?/, "").replace(/\n?\}$/, "");
    const caseLines = cases.map((c) => `    ${JSON.stringify(c)}`).join(",\n");
    return `  ${JSON.stringify(slug)}: {\n${head ? `${head},\n` : ""}  "cases": [\n${caseLines}\n  ],\n  "hints": ${JSON.stringify(hints)}\n  }`;
  });
  return `{\n${blocks.join(",\n")}\n}\n`;
}

writeFileSync(OUT, serialise(out));
console.log(`Wrote ${Object.keys(out).length} problems' test cases to ${OUT}`);
