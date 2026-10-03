/**
 * Authored lesson notes for a subtopic (data/notes/*.json). Pure: validation and
 * shaping only, no I/O. Notes are keyed by the subtopic id `${topicId}:${index}`
 * so they stay valid when subtopics are appended (never reordered).
 */
import { z } from "zod";

export const NOTE_SOURCE_KINDS = ["authored", "imported", "reference"] as const;

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "sources must be https");

export const noteSourceSchema = z.object({
  title: z.string().min(2).max(120),
  url: httpsUrl,
  /** authored = written for PrepOS, imported = adapted from a licensed repo, reference = link only. */
  kind: z.enum(NOTE_SOURCE_KINDS),
  license: z.string().min(2).max(40).optional(),
});

export const subtopicNoteSchema = z.object({
  /** Markdown lesson body. Rendered with react-markdown (no raw HTML). */
  body: z.string().min(200).max(12_000),
  keyPoints: z.array(z.string().min(5).max(220)).min(2).max(8),
  /** Optional Mermaid flowchart source (trusted repo content). */
  diagram: z.string().max(3_000).optional(),
  sources: z.array(noteSourceSchema).max(8),
});

export const notesFileSchema = z.record(z.string().regex(/^[a-z0-9-]+:\d+$/), subtopicNoteSchema);

export type NoteSource = z.infer<typeof noteSourceSchema>;
export type SubtopicNote = z.infer<typeof subtopicNoteSchema>;
export type NotesFile = z.infer<typeof notesFileSchema>;

const UNSAFE_DIAGRAM = /^\s*click\s|<script|javascript:/im;

export function isSafeDiagram(code: string): boolean {
  return !UNSAFE_DIAGRAM.test(code);
}

/** Problems with a notes file against the syllabus; empty when it is sound. */
export function notesProblems(file: NotesFile, subtopicTitleById: ReadonlyMap<string, unknown>): string[] {
  const problems: string[] = [];
  for (const [id, note] of Object.entries(file)) {
    if (!subtopicTitleById.has(id)) problems.push(`${id}: no such subtopic`);
    if (note.diagram && !isSafeDiagram(note.diagram)) problems.push(`${id}: unsafe diagram`);
    if (/<\s*(script|iframe|img|svg)\b/i.test(note.body)) problems.push(`${id}: raw HTML in body`);
  }
  return problems;
}

/** Fraction of a topic's subtopics that have a lesson. */
export function notesCoverage(topicId: string, subtopicCount: number, notes: Readonly<Record<string, unknown>>): number {
  if (subtopicCount === 0) return 0;
  let n = 0;
  for (let i = 0; i < subtopicCount; i++) if (`${topicId}:${i}` in notes) n++;
  return n / subtopicCount;
}

/** Reading time in minutes at ~200 wpm, minimum 1. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
