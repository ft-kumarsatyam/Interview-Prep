import { problemBySlug } from "@/core/content";
import { connectDb } from "@/core/db";
import { DsaBookmark } from "@/core/models/dsa-bookmark";

export async function listBookmarks(): Promise<string[]> {
  await connectDb();
  const rows = await DsaBookmark.find({}, { slug: 1 }).sort({ createdAt: -1 }).lean();
  return rows.map((row) => row.slug);
}

export async function setBookmark(slug: string, on: boolean): Promise<void> {
  if (!problemBySlug.has(slug)) throw new Error("Unknown problem");
  await connectDb();
  if (on) await DsaBookmark.updateOne({ slug }, { $setOnInsert: { slug } }, { upsert: true });
  else await DsaBookmark.deleteOne({ slug });
}
