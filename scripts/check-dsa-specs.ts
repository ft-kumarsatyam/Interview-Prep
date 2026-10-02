/**
 * Dry-run one batch of problem specs without touching data/dsa-testcases.json:
 *
 *   node --import tsx scripts/check-dsa-specs.ts scripts/dsa-testcases/specs/<file>.ts
 *
 * Prints every problem's errors (reference/brute disagreement, fuzz mismatch, lint) and a one-line summary.
 */
import path from "node:path";
import { problemBySlug } from "../lib/content";
import { buildEntry } from "./dsa-testcases/build";
import type { ProblemSpec } from "./dsa-testcases/types";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: check-dsa-specs.ts <spec file>");
    process.exit(2);
  }
  const mod = (await import(path.resolve(file))) as Record<string, unknown>;
  const specs = Object.values(mod).flatMap((v) => (Array.isArray(v) ? (v as ProblemSpec[]) : []));
  if (specs.length === 0) {
    console.error("No exported spec array found.");
    process.exit(2);
  }
  let bad = 0;
  const seen = new Set<string>();
  for (const spec of specs) {
    const { entry, errors } = buildEntry(spec, { slugExists: problemBySlug.has(spec.slug) });
    if (seen.has(spec.slug)) errors.push("slug defined twice");
    seen.add(spec.slug);
    if (errors.length) {
      bad++;
      console.error(`FAIL ${spec.slug}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else {
      console.log(`ok   ${spec.slug}  (${entry.cases.length} cases, ${entry.cases.filter((c) => c.hidden).length} hidden, ${entry.cases.filter((c) => c.edge).length} edge)`);
    }
  }
  console.log(`\n${specs.length - bad}/${specs.length} problems pass`);
  process.exit(bad ? 1 : 0);
}

void main();
