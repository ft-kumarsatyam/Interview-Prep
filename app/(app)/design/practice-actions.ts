"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { practiceCaseBySlug } from "@/lib/content";
import { EXPLAIN_SECTION_IDS, SECTION_MAX } from "@/lib/domain/practice-cases";
import { addPracticeMinutes, savePracticeSection, setPracticeRubric } from "@/lib/services/practice-cases";

const target = z
  .object({ kind: z.enum(["os", "dbms"]), slug: z.string().max(80) })
  .refine((t) => practiceCaseBySlug.has(`${t.kind}:${t.slug}`), "Unknown case");

const sectionSchema = z.object({
  target,
  section: z.enum(EXPLAIN_SECTION_IDS as [string, ...string[]]).transform((s) => s as (typeof EXPLAIN_SECTION_IDS)[number]),
  text: z.string().max(SECTION_MAX),
});

export async function savePracticeSectionAction(input: z.input<typeof sectionSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save: invalid input" };
  const { target: t, section, text } = parsed.data;
  await savePracticeSection(t.kind, t.slug, section, text);
  return { ok: true };
}

const rubricSchema = z.object({ target, checked: z.array(z.string().max(40)).max(50) });

export async function savePracticeRubricAction(input: z.input<typeof rubricSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = rubricSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save the rubric" };
  await setPracticeRubric(parsed.data.target.kind, parsed.data.target.slug, parsed.data.checked);
  return { ok: true };
}

const minutesSchema = z.object({ target, minutes: z.number().int().min(1).max(180) });

export async function addPracticeMinutesAction(input: z.input<typeof minutesSchema>): Promise<ActionResult<{ minutesSpent: number }>> {
  await requireSession();
  const parsed = minutesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid time" };
  const { target: t, minutes } = parsed.data;
  return { ok: true, minutesSpent: await addPracticeMinutes(t.kind, t.slug, minutes) };
}
