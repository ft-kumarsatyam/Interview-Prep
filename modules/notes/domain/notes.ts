import { z } from "zod";

export const NOTE_KINDS = ["lesson", "article", "course", "problem", "design", "interview", "other"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_COLORS = ["yellow", "blue", "green", "pink", "purple"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const capturedNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().max(20_000).default(""),
  excerpt: z.string().trim().min(1).max(8_000),
  source: z.object({
    href: z.string().url().max(500),
    title: z.string().trim().min(1).max(200),
    kind: z.enum(NOTE_KINDS),
    heading: z.string().max(200).default(""),
  }),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  highlightColor: z.enum(NOTE_COLORS).default("yellow"),
  flashcard: z.object({ question: z.string().max(500), answer: z.string().max(1_500) }).optional(),
  reviewOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

export const capturedNotePatchSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().max(20_000).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
  highlightColor: z.enum(NOTE_COLORS).optional(),
  reviewOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export function titleForExcerpt(excerpt: string, heading?: string): string {
  const cleanHeading = heading?.trim();
  if (cleanHeading) return cleanHeading.slice(0, 160);
  const firstLine = excerpt.trim().split(/\r?\n/)[0] ?? "Captured note";
  return firstLine.slice(0, 157) + (firstLine.length > 157 ? "..." : "");
}
