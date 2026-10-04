import { connectDb } from "@/core/db";
import { CapturedNote } from "@/core/models/notes";
import { capturedNoteInputSchema, capturedNotePatchSchema, type NoteColor, type NoteKind } from "@/modules/notes/domain/notes";

export interface CapturedNoteView {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  source: { href: string; title: string; kind: NoteKind; heading: string };
  tags: string[];
  highlightColor: NoteColor;
  reviewOn: string | null;
  createdAt: string;
  updatedAt: string;
}

const view = (row: {
  _id: unknown;
  title: string;
  body: string;
  excerpt: string;
  source?: { href: string; title: string; kind: NoteKind; heading?: string } | null;
  tags?: string[];
  highlightColor?: NoteColor;
  reviewOn?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): CapturedNoteView => ({
  id: String(row._id),
  title: row.title,
  body: row.body ?? "",
  excerpt: row.excerpt,
  source: row.source ? { ...row.source, heading: row.source.heading ?? "" } : { href: "", title: "Captured note", kind: "other", heading: "" },
  tags: row.tags ?? [],
  highlightColor: row.highlightColor ?? "yellow",
  reviewOn: row.reviewOn ?? null,
  createdAt: (row.createdAt ?? new Date()).toISOString(),
  updatedAt: (row.updatedAt ?? new Date()).toISOString(),
});

export async function createCapturedNote(input: unknown): Promise<CapturedNoteView> {
  const parsed = capturedNoteInputSchema.parse(input);
  await connectDb();
  const row = await CapturedNote.create(parsed);
  return view(row.toObject());
}

export async function listCapturedNotes(query?: { search?: string; tag?: string }): Promise<CapturedNoteView[]> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  const search = query?.search?.trim();
  if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { body: { $regex: search, $options: "i" } }, { excerpt: { $regex: search, $options: "i" } }];
  if (query?.tag) filter.tags = query.tag;
  const rows = await CapturedNote.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
  return rows.map(view);
}

export async function listDueCapturedNotes(today: string): Promise<CapturedNoteView[]> {
  await connectDb();
  const rows = await CapturedNote.find({ reviewOn: { $ne: null, $lte: today } }).sort({ reviewOn: 1, updatedAt: -1 }).limit(50).lean();
  return rows.map(view);
}

export async function updateCapturedNote(input: unknown): Promise<void> {
  const parsed = capturedNotePatchSchema.parse(input);
  const { id, ...patch } = parsed;
  await connectDb();
  await CapturedNote.updateOne({ _id: id }, { $set: patch });
}

export async function deleteCapturedNote(id: string): Promise<void> {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Unknown note");
  await connectDb();
  await CapturedNote.deleteOne({ _id: id });
}
