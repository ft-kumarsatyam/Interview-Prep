/**
 * Prompt eval harness: runs the golden set (modules/ai/lib/prompts/golden.ts) against every configured FREE provider and
 * reports schema validity, grounding and latency per provider. Never calls the paid provider.
 * Usage: npm run ai:eval            (add -- --min-schema 90 --min-grounded 70 to make it exit non-zero below the floors)
 */
import { env } from "@/core/env";
import { createLlm } from "@/core/llm/json-provider";
import { resolveProviders } from "@/core/llm/providers";
import { gate, scoreJsonAnswer, scoreRagAnswer, summarize, type Outcome } from "@/modules/ai/domain/ai-eval";
import { explainOutputSchema } from "@/modules/ai/domain/ai-explain";
import { GOLDEN } from "@/modules/ai/lib/prompts/golden";
import { PROMPTS } from "@/modules/ai/lib/prompts";

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

async function main() {
  const defs = resolveProviders(env()).filter((d) => !d.paid);
  if (defs.length === 0) throw new Error("No free provider configured (set GEMINI_API_KEY or GROQ_API_KEY in .env.local).");
  const outcomes: Outcome[] = [];

  for (const def of defs) {
    const llm = createLlm(def.cfg);
    if (!llm) continue;
    for (const c of GOLDEN) {
      const started = Date.now();
      try {
        if (c.prompt === "explain") {
          const prompt = PROMPTS.explain.build(c.input);
          let valid = true;
          let text = "";
          try {
            const out = await llm.generateJson(prompt, explainOutputSchema);
            text = `${out.explanation} ${out.whyYourAnswerWasWrong ?? ""} ${out.remember ?? ""}`;
          } catch {
            valid = false;
          }
          outcomes.push({ caseId: c.id, provider: def.id, latencyMs: Date.now() - started, ...scoreJsonAnswer(valid, text, c.expect) });
        } else {
          if (!llm.streamText) continue;
          let text = "";
          for await (const chunk of llm.streamText(PROMPTS["rag-answer"].build(c.input))) text += chunk;
          outcomes.push({ caseId: c.id, provider: def.id, latencyMs: Date.now() - started, ...scoreRagAnswer(text, c.input.passages.length, c.expect) });
        }
      } catch (err) {
        outcomes.push({ caseId: c.id, provider: def.id, latencyMs: Date.now() - started, schemaValid: false, grounded: false, problems: [], error: err instanceof Error ? err.message.slice(0, 120) : "failed" });
      }
    }
  }

  for (const o of outcomes.filter((x) => !x.grounded)) console.log(`✗ ${o.provider} ${o.caseId}: ${o.error ?? o.problems.join("; ")}`);
  console.table(summarize(outcomes));
  const failures = gate(summarize(outcomes), { schemaValidPct: arg("min-schema", 0), groundedPct: arg("min-grounded", 0) });
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
