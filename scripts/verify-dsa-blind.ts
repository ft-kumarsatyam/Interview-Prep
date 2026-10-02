/**
 * Runs independently written ("blind") solutions against the committed test cases:
 *
 *   node --import tsx scripts/verify-dsa-blind.ts scripts/dsa-verify/<file>.ts
 *
 * The file exports a Record<slug, source of a JS function>. Every case is run through the same
 * node:vm harness the generator uses (with the problem's argTypes/returns/compare) and mismatches are printed.
 */
import path from "node:path";
import { testcaseBySlug } from "../lib/content";
import { workerLib } from "../lib/sandbox/worker-lib-node";
import { loadSolution } from "./dsa-testcases/vm-runner";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: verify-dsa-blind.ts <file>");
    process.exit(2);
  }
  const mod = (await import(path.resolve(file))) as Record<string, unknown>;
  const solutions = Object.values(mod).find((v) => v && typeof v === "object" && !Array.isArray(v)) as Record<string, string> | undefined;
  if (!solutions) {
    console.error("No exported Record<slug, source> found.");
    process.exit(2);
  }
  const lib = workerLib();
  let bad = 0;
  for (const [slug, source] of Object.entries(solutions)) {
    const entry = testcaseBySlug.get(slug);
    if (!entry) {
      console.error(`${slug}: not in data/dsa-testcases.json`);
      bad++;
      continue;
    }
    const run = loadSolution(source, entry.signature.functionName, { argTypes: entry.argTypes, returns: entry.returns });
    const fails: string[] = [];
    entry.cases.forEach((c, i) => {
      let got: unknown;
      try {
        got = run(structuredClone(c.input));
      } catch (e) {
        fails.push(`  case ${i}: threw ${(e as Error).message}`);
        return;
      }
      if (!lib.matches(got, c.expected, entry.compare ?? "exact")) {
        fails.push(`  case ${i} (${c.hidden ? "hidden" : "visible"}${c.edge ? `, ${c.edge}` : ""}): input ${JSON.stringify(c.input).slice(0, 160)}\n    expected ${JSON.stringify(c.expected)?.slice(0, 160)}\n    got      ${JSON.stringify(got)?.slice(0, 160)}`);
      }
    });
    if (fails.length) {
      bad++;
      console.error(`FAIL ${slug}\n${fails.join("\n")}`);
    } else console.log(`ok   ${slug} (${entry.cases.length} cases)`);
  }
  console.log(`\n${Object.keys(solutions).length - bad}/${Object.keys(solutions).length} agree with the committed cases`);
  process.exit(bad ? 1 : 0);
}
void main();
