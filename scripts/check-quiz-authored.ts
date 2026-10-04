/**
 * Dry-run authored subtopic questions, or list what a topic needs:
 *   node --import tsx scripts/check-quiz-authored.ts scripts/quiz-bank/authored/<topicId>.json [...]
 *   node --import tsx scripts/check-quiz-authored.ts --list <topicId> [...]
 */
import path from "node:path";
import { subtopics, topicById } from "@/core/content";
import { bank } from "@/modules/quiz/lib/bank";
import { buildAllAuthored, readAuthored } from "./quiz-bank/authored";

const MIN_AUTHORED_PER_SUBTOPIC = 10;

const args = process.argv.slice(2);

function list(topicIds: string[]) {
  for (const topicId of topicIds) {
    const topic = topicById.get(topicId);
    if (!topic) {
      console.error(`unknown topic ${topicId}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`\n# ${topic.id}: ${topic.title} (track ${topic.track}, week ${topic.week})`);
    for (const sub of subtopics.filter((s) => s.topicId === topicId)) {
      console.log(`\n## ${sub.id}: ${sub.title}`);
      for (const q of (bank().bySubtopic.get(sub.id) ?? []).filter((q) => q.style !== "recall")) {
        console.log(`  - existing (${q.style}${q.type ? `/${q.type}` : ""}): ${q.prompt}${q.code ? ` [code: ${q.code.split("\n")[0]}…]` : ""}`);
      }
    }
  }
}

async function check(files: string[]) {
  const resolved = files.map((f) => path.resolve(f));
  const { questions, errors } = await buildAllAuthored(resolved);
  const existing = new Set(bank().all.filter((q) => q.style !== "recall").map((q) => q.prompt + (q.code ?? "")));
  const perRef = new Map<string, typeof questions>();
  for (const q of questions) perRef.set(q.source.ref, [...(perRef.get(q.source.ref) ?? []), q]);

  const refs = new Set(readAuthored(resolved).map((e) => e.ref));
  const topicIds = new Set([...refs].map((r) => r.split(":")[0]!));
  for (const topicId of topicIds) {
    for (const sub of subtopics.filter((s) => s.topicId === topicId)) {
      if (!refs.has(sub.id)) errors.push(`${sub.id} (${sub.title}): no questions authored`);
    }
  }
  for (const [ref, qs] of perRef) {
    if (qs.length < MIN_AUTHORED_PER_SUBTOPIC) errors.push(`${ref}: only ${qs.length} valid questions (need ${MIN_AUTHORED_PER_SUBTOPIC}+)`);
    const types = qs.reduce<Record<string, number>>((m, q) => ((m[q.style === "output" ? "output" : (q.type ?? "single")] = (m[q.style === "output" ? "output" : (q.type ?? "single")] ?? 0) + 1), m), {});
    const diff = qs.reduce<Record<string, number>>((m, q) => ((m[q.difficulty ?? "?"] = (m[q.difficulty ?? "?"] ?? 0) + 1), m), {});
    const dupes = qs.filter((q) => existing.has(q.prompt + (q.code ?? ""))).length;
    console.log(`${ref}: ${qs.length} questions · ${JSON.stringify(types)} · ${JSON.stringify(diff)}${dupes ? ` · ${dupes} repeat an existing bank question` : ""}`);
  }
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n${errors.map((e) => `- ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`\nOK: ${questions.length} questions`);
}

if (args[0] === "--list") list(args.slice(1));
else if (args.length) void check(args);
else {
  console.error("usage: check-quiz-authored.ts <file.json ...> | --list <topicId ...>");
  process.exit(2);
}
