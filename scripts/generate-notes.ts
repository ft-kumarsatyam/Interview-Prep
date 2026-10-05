/**
 * Writes detailed lesson notes (data/notes/<track>.json) for subtopics that have none.
 * Resumable: notes already in the output file or in any other data/notes file are kept.
 *
 *   npm run notes -- --track=dbms
 *   npm run notes -- --track=js,node --max=20
 *
 * Needs LLM_API_KEY or GEMINI_API_KEY (LLM_PROVIDER/LLM_MODEL as in scripts/generate-quiz-bank.ts). Output is zod-validated,
 * raw HTML and unsafe diagrams are rejected, and sources are left empty because a model must
 * not invent URLs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { subtopicNotes, subtopics, topicById, trackById } from "@/core/content";
import { llmFromEnv, withRetry } from "./lib/llm-env";
import { isSafeDiagram, notesFileSchema, subtopicNoteSchema, type NotesFile } from "@/modules/learn/domain/notes";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);

const llmNoteSchema = subtopicNoteSchema.omit({ sources: true });

function prompt(sub: { id: string; title: string; topicId: string }, trackName: string, siblings: string[]): string {
  const topic = topicById.get(sub.topicId);
  return `You are writing a study note for a senior backend engineer preparing for software interviews.

Track: ${trackName}
Topic: ${topic?.title ?? sub.topicId}
Subtopic: ${sub.title}
Other subtopics in this topic (do not repeat them): ${siblings.join("; ")}

Return JSON {"body": string, "keyPoints": string[], "diagram"?: string} where:
- body is Markdown, 450 to 900 words, with these ## sections in order: "The problem" (why this exists), "How it works" (mechanism, precise and concrete), "Example" (a runnable, correct code or query example in a fenced block, with the expected output in a comment), "Trade-offs and pitfalls" (bullets of real mistakes), "In the interview" (what is asked, a strong short answer, common follow-ups).
- No raw HTML, no images, no links, no front matter. Use normal backticks for code in the body; never use the § character in the body.
- keyPoints is 4 to 6 one-sentence takeaways, each 5 to 200 characters. Wrap code identifiers in §...§ instead of backticks.
- diagram is optional, a Mermaid flowchart or sequenceDiagram under 1,500 characters, only when it clarifies a flow. Never use click directives.
Be accurate. If unsure of a detail, leave it out rather than guess.`;
}

async function main() {
  const llm = llmFromEnv();
  if (!llm) {
    console.error("set LLM_API_KEY (or GEMINI_API_KEY)");
    process.exit(1);
  }
  const tracks = args.get("track")?.split(",");
  if (!tracks) {
    console.error("pass --track=<id>[,<id>] (one output file per track)");
    process.exit(1);
  }
  const max = Number(args.get("max") ?? Infinity);
  const delay = Number(process.env.LLM_DELAY_MS ?? 4000);

  for (const track of tracks) {
    const file = path.join(process.cwd(), "data", "notes", `${track}.json`);
    const out: NotesFile = existsSync(file) ? notesFileSchema.parse(JSON.parse(readFileSync(file, "utf8"))) : {};
    const todo = subtopics.filter((s) => s.track === track && !(s.id in out) && !subtopicNotes.has(s.id)).slice(0, max);
    console.log(`${track}: ${todo.length} to write (${Object.keys(out).length} already in file)`);
    for (const sub of todo) {
      const siblings = subtopics.filter((s) => s.topicId === sub.topicId && s.id !== sub.id).map((s) => s.title);
      try {
        const res = await withRetry(() => llm.generateJson(prompt(sub, trackById.get(track)?.name ?? track, siblings), llmNoteSchema as z.ZodType<z.infer<typeof llmNoteSchema>>));
        if (/<\s*(script|iframe|img|svg)\b/i.test(res.body)) throw new Error("raw HTML in body");
        const diagram = res.diagram && isSafeDiagram(res.diagram) ? res.diagram : undefined;
        out[sub.id] = { body: res.body.replaceAll("§", ""), keyPoints: res.keyPoints, ...(diagram ? { diagram } : {}), sources: [] };
        writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
        console.log(`  ${sub.id} ok`);
      } catch (err) {
        console.warn(`  ${sub.id} failed: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

void main();
