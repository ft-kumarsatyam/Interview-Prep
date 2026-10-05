import { interviewQuestions, interviewTracks, practiceCases, problems, systemDesign } from "@/core/content";
import { connectDb } from "@/core/db";
import { fetchSafe, SafeFetchError } from "@/core/http-safe";
import { BankQuestion } from "@/core/models/interview-bank";
import { takeToken } from "@/core/services/rate-limit";
import { runAi } from "@/modules/ai/services/ai";
import {
  bankInputSchema,
  draftPrompt,
  draftSetSchema,
  extractedItemSchema,
  extractedSetSchema,
  extractPrompt,
  htmlToText,
  markDuplicates,
  parseImportUrl,
  questionKey,
  seedDesign,
  seedDsa,
  seedPracticeCases,
  seedWebInterview,
  type BankInput,
  type BankItem,
  type Candidate,
  type Category,
  type ExtractedItem,
} from "@/modules/interview-bank/domain/bank";

export const IMPORT_LIMIT = { max: 15, windowSec: 3600 };
export const DRAFT_LIMIT = { max: 8, windowSec: 3600 };
export const MAX_STORED = 2000;

let seed: BankItem[] | undefined;
/** The questions that ship with PrepOS, mapped into one shape. Built once. */
export function seedItems(): BankItem[] {
  seed ??= [...seedWebInterview(interviewQuestions, interviewTracks), ...seedDesign(systemDesign.cases), ...seedPracticeCases(practiceCases), ...seedDsa(problems)];
  return seed;
}

type Row = Awaited<ReturnType<typeof loadRows>>[number];
const loadRows = async () => {
  await connectDb();
  return BankQuestion.find({}).sort({ createdAt: -1 }).limit(MAX_STORED).lean();
};
const toItem = (r: Row): BankItem => ({
  id: `own:${String(r._id)}`,
  category: r.category as Category,
  question: r.question,
  answer: r.answer ?? null,
  level: r.level ?? null,
  company: r.company ?? null,
  role: r.role ?? null,
  round: r.round ?? null,
  tags: r.tags ?? [],
  source: r.source as BankItem["source"],
  sourceUrl: r.sourceUrl ?? null,
  href: null,
});

/** Everything in the bank: your questions first, then the built-in ones. */
export async function listBank(): Promise<BankItem[]> {
  return [...(await loadRows()).map(toItem), ...seedItems()];
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function addQuestion(raw: unknown, source: "own" | "web" | "ai" = "own", sourceUrl: string | null = null): Promise<SaveResult> {
  const parsed = bankInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the question" };
  return insert(parsed.data, source, sourceUrl);
}

async function insert(input: BankInput, source: "own" | "web" | "ai", sourceUrl: string | null): Promise<SaveResult> {
  await connectDb();
  if ((await BankQuestion.estimatedDocumentCount()) >= MAX_STORED) return { ok: false, error: "The bank is full. Delete some questions first" };
  const key = questionKey(input.question);
  const dup = await BankQuestion.exists({ key });
  if (dup || seedItems().some((s) => questionKey(s.question) === key)) return { ok: false, error: "That question is already in the bank" };
  const doc = await BankQuestion.create({ ...input, key, source, sourceUrl });
  return { ok: true, id: `own:${String(doc._id)}` };
}

export async function updateQuestion(id: string, raw: unknown): Promise<SaveResult> {
  const parsed = bankInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the question" };
  const oid = id.replace(/^own:/, "");
  if (!/^[a-f0-9]{24}$/i.test(oid)) return { ok: false, error: "Unknown question" };
  await connectDb();
  const key = questionKey(parsed.data.question);
  const clash = await BankQuestion.exists({ key, _id: { $ne: oid } });
  if (clash) return { ok: false, error: "Another question already says that" };
  const res = await BankQuestion.updateOne({ _id: oid }, { $set: { ...parsed.data, key } });
  return res.matchedCount ? { ok: true, id } : { ok: false, error: "Unknown question" };
}

export async function deleteQuestion(id: string): Promise<void> {
  const oid = id.replace(/^own:/, "");
  if (!/^[a-f0-9]{24}$/i.test(oid)) throw new Error("Unknown question");
  await connectDb();
  await BankQuestion.deleteOne({ _id: oid });
}

async function existingKeys(): Promise<Set<string>> {
  await connectDb();
  const rows = await BankQuestion.find({}, { key: 1 }).lean();
  return new Set([...rows.map((r) => r.key), ...seedItems().map((s) => questionKey(s.question))]);
}

export type PreviewResult = { ok: true; url: string; candidates: Candidate[] } | { ok: false; error: string };

/**
 * Reads one public page you pasted and drafts the questions on it, for you to review before anything is saved. The page is
 * fetched through the SSRF-checked reader (https only, size and time capped, login sites refused), its text goes to a free
 * model as untrusted data, and only well-formed questions come back. Nothing is stored here.
 */
export async function previewImport(rawUrl: string, company?: string): Promise<PreviewResult> {
  const parsed = parseImportUrl(rawUrl);
  if (!parsed.ok) return parsed;
  const limit = await takeToken("bank-import", IMPORT_LIMIT);
  if (!limit.allowed) return { ok: false, error: "You've imported a lot recently. Try again in a little while" };

  let html: string;
  try {
    const res = await fetchSafe(parsed.url, { maxBytes: 1_500_000, timeoutMs: 12_000, accept: /html|text\/plain/i });
    if (res.status >= 400) return { ok: false, error: `The page answered with an error (${res.status})` };
    html = res.text;
  } catch (err) {
    return { ok: false, error: err instanceof SafeFetchError ? err.message : "Could not read that page" };
  }
  const text = htmlToText(html);
  if (text.length < 200) return { ok: false, error: "There isn't enough readable text on that page (it may need JavaScript or a login)" };

  const ai = await runAi("generate-questions", {}, (llm) => llm.generateJson(extractPrompt(text, company ? { company } : {}), extractedSetSchema));
  if (!ai.ok) return { ok: false, error: ai.error };
  const items = ai.data.questions.map((q) => extractedItemSchema.parse({ ...q, company: q.company || company || "" }));
  if (items.length === 0) return { ok: false, error: "No interview questions found on that page" };
  return { ok: true, url: parsed.url, candidates: markDuplicates(items, await existingKeys()) };
}

/** Saves the questions you ticked after reviewing the preview, each tagged with the page it came from. */
export async function saveImported(rawUrl: string, items: unknown): Promise<{ ok: true; added: number; skipped: number } | { ok: false; error: string }> {
  const parsed = parseImportUrl(rawUrl);
  if (!parsed.ok) return parsed;
  const list = extractedSetSchema.safeParse({ questions: items });
  if (!list.success) return { ok: false, error: "Check the questions you selected" };
  let added = 0;
  let skipped = 0;
  for (const q of list.data.questions) {
    const res = await insert(
      bankInputSchema.parse({ category: q.category, question: q.question, answer: q.answer, level: q.level, company: q.company, round: q.round, tags: [] }),
      "web",
      parsed.url,
    );
    if (res.ok) added++;
    else skipped++;
  }
  return { ok: true, added, skipped };
}

/** Practice questions in a company's style, drafted by a model and labelled AI-drafted (they are not that company's real questions). */
export async function draftForCompany(company: string, category: Category, count = 5): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const name = company.trim().slice(0, 60);
  if (name.length < 2) return { ok: false, error: "Enter a company name" };
  const limit = await takeToken("bank-draft", DRAFT_LIMIT);
  if (!limit.allowed) return { ok: false, error: "You've drafted a lot recently. Try again in a little while" };
  const avoid = (await listBank()).filter((i) => i.company?.toLowerCase() === name.toLowerCase()).map((i) => i.question);
  const ai = await runAi("generate-questions", {}, (llm) => llm.generateJson(draftPrompt({ company: name, category, count, avoid }), draftSetSchema));
  if (!ai.ok) return { ok: false, error: ai.error };
  let added = 0;
  for (const q of ai.data.questions) {
    const res = await insert(bankInputSchema.parse({ category, question: q.question, answer: q.answer, level: q.level, company: name, tags: ["ai-drafted"] }), "ai", null);
    if (res.ok) added++;
  }
  return added > 0 ? { ok: true, added } : { ok: false, error: "The model's questions were repeats or malformed. Try again" };
}

export type { ExtractedItem };
