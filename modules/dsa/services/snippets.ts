import { isValidObjectId } from "mongoose";
import { connectDb } from "@/core/db";
import { isLanguage, type Language } from "@/modules/dsa/domain/starters";
import { Snippet } from "@/core/models/learning";

export interface SnippetSummary {
  id: string;
  title: string;
  tag: string;
  code: string;
  language: Language;
  updatedAt: string;
}

export async function listSnippets(): Promise<SnippetSummary[]> {
  await connectDb();
  const rows = await Snippet.find().sort({ updatedAt: -1 }).limit(100).lean();
  return rows.map((r) => ({
    id: String(r._id),
    title: r.title,
    tag: r.tag ?? "",
    code: r.code,
    language: isLanguage(r.language) ? r.language : "javascript",
    updatedAt: (r.updatedAt as Date | undefined)?.toISOString() ?? "",
  }));
}

export async function saveSnippet(input: { id?: string; title: string; code: string; tag: string; language?: Language }): Promise<string> {
  await connectDb();
  const language = input.language ?? "javascript";
  if (input.id) {
    if (!isValidObjectId(input.id)) throw new Error("Unknown snippet");
    await Snippet.updateOne({ _id: input.id }, { $set: { title: input.title, code: input.code, tag: input.tag, language } });
    return input.id;
  }
  const doc = await Snippet.create({ title: input.title, code: input.code, tag: input.tag, language });
  return String(doc._id);
}

export async function deleteSnippet(id: string): Promise<void> {
  if (!isValidObjectId(id)) throw new Error("Unknown snippet");
  await connectDb();
  await Snippet.deleteOne({ _id: id });
}
