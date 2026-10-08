/**
 * Writes data/dsa-extra-problems.json from the definitions in scripts/dsa-extras/*.ts. Run it before
 * generate-dsa-testcases.ts, which then picks up the judges of these problems (core/content reads the JSON at load).
 *
 *   node --import tsx scripts/generate-dsa-extras.ts            # write the catalogue
 *   node --import tsx scripts/generate-dsa-extras.ts --check    # dry-run every judge, write nothing
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { problems } from "@/core/content";
import { extraCatalogueSchema, extraSlugClashes } from "@/modules/dsa/domain/extra-problems";
import { buildEntry } from "./dsa-testcases/build";
import { ALL_EXTRAS } from "./dsa-extras";

const OUT = path.join(process.cwd(), "data", "dsa-extra-problems.json");
const check = process.argv.includes("--check");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const extras = ALL_EXTRAS.map((b) => b.extra);
const clashes = extraSlugClashes(extras, new Set(problems.map((p) => p.slug)));
if (clashes.length) {
  console.error(`Slugs defined twice or already seeded: ${clashes.join(", ")}`);
  process.exit(1);
}

if (check) {
  let bad = 0;
  for (const { spec } of ALL_EXTRAS) {
    if (only && !spec.slug.includes(only)) continue;
    const { entry, errors } = buildEntry(spec, { slugExists: true });
    if (errors.length) {
      bad++;
      console.error(`FAIL ${spec.slug}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else console.log(`ok   ${spec.slug}  (${entry.cases.length} cases, ${entry.cases.filter((c) => c.hidden).length} hidden)`);
  }
  console.log(`\n${ALL_EXTRAS.length - bad}/${ALL_EXTRAS.length} extras pass`);
  process.exit(bad ? 1 : 0);
}

const catalogue = extraCatalogueSchema.parse({ generatedAt: new Date().toISOString().slice(0, 10), problems: extras });
writeFileSync(OUT, `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`Wrote ${catalogue.problems.length} extra problems to ${path.relative(process.cwd(), OUT)}`);
