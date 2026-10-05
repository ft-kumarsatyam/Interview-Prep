/**
 * Writes scenario and debugging questions to data/quiz-scenarios.json, merged into the bank at load.
 * Resumable (subtopics already done are skipped). Every question is verified by a second, independent answer
 * from the model; a question whose key the second pass disagrees with is dropped, never stored.
 *
 *   npm run quiz-scenarios -- --track=hld,dbms --per=3
 *   npm run quiz-scenarios -- --track=node --max=10
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { subtopics, trackById } from "@/core/content";
import { agrees, scenarioPrompt, scenarioSetSchema, toStoredScenario, verifyAnswerSchema, verifyPrompt } from "@/modules/quiz/domain/scenario";
import { bank } from "@/modules/quiz/lib/bank";
import { quizBankSchema, type QuizBank } from "@/modules/quiz/lib/question";
import { llmFromEnv, withRetry } from "./lib/llm-env";

const OUT = path.join(process.cwd(), "data", "quiz-scenarios.json");
const args = new Map(process.argv.slice(2).map((a) => [a.replace(/^--/, "").split("=")[0]!, a.split("=")[1] ?? "true"] as const));
const hashId = (...parts: string[]) => `sc-${createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 12)}`;

async function main() {
  const llm = llmFromEnv();
  if (!llm) {
    console.error("set LLM_API_KEY (or GEMINI_API_KEY)");
    process.exit(1);
  }
  const tracks = args.get("track")?.split(",");
  const per = Math.min(5, Math.max(1, Number(args.get("per") ?? 3)));
  const max = Number(args.get("max") ?? Infinity);
  const delay = Number(process.env.LLM_DELAY_MS ?? 4000);
  const out: QuizBank = quizBankSchema.parse(JSON.parse(readFileSync(OUT, "utf8")));
  const done = new Set(out.questions.map((q) => q.source.ref));
  const todo = subtopics.filter((s) => (!tracks || tracks.includes(s.track)) && !done.has(s.id)).slice(0, max);
  console.log(`${todo.length} subtopics to do`);

  for (const sub of todo) {
    try {
      const avoid = (bank().bySubtopic.get(sub.id) ?? []).map((q) => q.prompt);
      const set = await withRetry(() => llm.generateJson(scenarioPrompt({ subtopic: sub.title, topic: sub.topicTitle, track: trackById.get(sub.track)?.name ?? sub.track, count: per, avoid }), scenarioSetSchema(1, per + 2)));
      let kept = 0;
      for (const item of set.questions.slice(0, per)) {
        const second = await withRetry(() => llm.generateJson(verifyPrompt(item), verifyAnswerSchema));
        if (!agrees(item, second)) continue;
        out.questions.push(toStoredScenario(item, hashId(sub.id, item.prompt), sub.id));
        kept++;
      }
      out.generatedAt = new Date().toISOString();
      writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
      console.log(`  ${sub.id}: kept ${kept}/${Math.min(per, set.questions.length)}`);
    } catch (err) {
      console.warn(`  ${sub.id} failed: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, delay));
  }
}

void main();
