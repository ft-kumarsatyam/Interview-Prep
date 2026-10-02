"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import { designCaseBySlug } from "@/lib/content";
import { DESIGN_SECTION_IDS, SECTION_MAX } from "@/lib/domain/design";
import { addDesignMinutes, saveDesignSection, setDesignRubric } from "@/lib/services/designs";

const slug = z.string().refine((s) => designCaseBySlug.has(s), "Unknown case");

const sectionSchema = z.object({
  slug,
  section: z.enum(DESIGN_SECTION_IDS as [string, ...string[]]).transform((s) => s as (typeof DESIGN_SECTION_IDS)[number]),
  text: z.string().max(SECTION_MAX),
});

export async function saveDesignSectionAction(input: z.input<typeof sectionSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save: invalid input" };
  await saveDesignSection(parsed.data.slug, parsed.data.section, parsed.data.text);
  return { ok: true };
}

const rubricSchema = z.object({ slug, checked: z.array(z.string().max(40)).max(50) });

export async function saveDesignRubricAction(input: z.input<typeof rubricSchema>): Promise<ActionResult> {
  await requireSession();
  const parsed = rubricSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save the rubric" };
  await setDesignRubric(parsed.data.slug, parsed.data.checked);
  return { ok: true };
}

const minutesSchema = z.object({ slug, minutes: z.number().int().min(1).max(180) });

export async function addDesignMinutesAction(input: z.input<typeof minutesSchema>): Promise<ActionResult<{ minutesSpent: number }>> {
  await requireSession();
  const parsed = minutesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid time" };
  return { ok: true, minutesSpent: await addDesignMinutes(parsed.data.slug, parsed.data.minutes) };
}
