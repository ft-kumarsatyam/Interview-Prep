/**
 * Dry-runs the judges whose slug contains a filter, from every spec batch, without writing any data file. Faster
 * than a full regenerate while authoring.
 *
 *   node --import tsx scripts/check-dsa-batch.ts palindrom
 */
import { problemBySlug } from "@/core/content";
import { buildEntry } from "./dsa-testcases/build";
import { ALL_SPECS } from "./dsa-testcases/specs";
import { ALL_EXTRAS } from "./dsa-extras";

const filters = process.argv.slice(2);
const extraSlugs = new Set(ALL_EXTRAS.map((b) => b.spec.slug));
let bad = 0;
let seen = 0;
for (const spec of ALL_SPECS) {
  if (filters.length && !filters.some((f) => spec.slug.includes(f))) continue;
  seen++;
  const { entry, errors } = buildEntry(spec, { slugExists: extraSlugs.has(spec.slug) || problemBySlug.has(spec.slug) });
  if (errors.length) {
    bad++;
    console.error(`FAIL ${spec.slug}`);
    for (const e of errors) console.error(`  - ${e}`);
  } else console.log(`ok   ${spec.slug}  (${entry.cases.length} cases, ${entry.cases.filter((c) => c.hidden).length} hidden)`);
}
console.log(`\n${seen - bad}/${seen} pass`);
process.exit(bad ? 1 : 0);
