import { connectDb } from "@/core/db";
import { scoreResume } from "@/modules/jobs/domain/ats";
import { parseResumeText, RESUME_TEXT_MAX } from "@/modules/resume/domain/resume";
import { skillsFirstFor, tailorPrompt, tailorSchema, validateTailor, type Change, type Rejected, type TailorPatch } from "@/modules/resume/domain/resume-tailor";
import { resumeRoastSchema, ROAST_PROMPT_VERSION, roastFromRules, roastPrompt, type ResumeRoast } from "@/modules/resume/domain/resume-ai";
import { effectiveRoastLevel } from "@/modules/resume/domain/roast";
import { env } from "@/core/env";
import { Resume } from "@/core/models/resume";
import { runAi } from "@/modules/ai/services/ai";
import { cachedAi } from "@/modules/ai/services/ai-cache";
import { getSettings } from "@/modules/settings/services/settings";

export interface ResumeDto {
  id: string;
  kind: "base" | "version";
  label: string;
  text: string;
  company: string;
  role: string;
  jd: string;
  updatedAt: string;
}

const toDto = (d: { _id: unknown; kind: string; label?: string | null; text: string; company?: string | null; role?: string | null; jd?: string | null; updatedAt?: Date }): ResumeDto => ({
  id: String(d._id),
  kind: d.kind as ResumeDto["kind"],
  label: d.label ?? "",
  text: d.text,
  company: d.company ?? "",
  role: d.role ?? "",
  jd: d.jd ?? "",
  updatedAt: (d.updatedAt ?? new Date()).toISOString(),
});

export async function getBaseResume(): Promise<ResumeDto | null> {
  await connectDb();
  const d = await Resume.findOne({ kind: "base" }).lean();
  return d ? toDto(d) : null;
}

/** Whether a base resume is saved, without loading its text. */
export async function hasBaseResume(): Promise<boolean> {
  await connectDb();
  return !!(await Resume.exists({ kind: "base" }));
}

/** Replaces the base resume's text (creating it the first time). */
export async function saveBaseResume(text: string): Promise<ResumeDto> {
  const clean = text.replace(/\r/g, "").replace(/\u0000/g, "").trim();
  if (clean.length < 50) throw new Error("That is too short to be a resume");
  if (clean.length > RESUME_TEXT_MAX) throw new Error(`Keep it under ${RESUME_TEXT_MAX.toLocaleString()} characters`);
  await connectDb();
  const d = await Resume.findOneAndUpdate({ kind: "base" }, { $set: { text: clean }, $setOnInsert: { label: "My resume" } }, { upsert: true, returnDocument: "after" }).lean();
  return toDto(d!);
}

export type RoastResult =
  | { ok: true; roast: ResumeRoast; source: "ai" | "rules"; cached: boolean; provider?: string }
  | { ok: false; error: string };

/**
 * The roast of the saved base resume, at the level chosen in Settings. Uses the free LLM when one is
 * configured and falls back to a rules-only roast otherwise, so it always answers. Never uses the paid
 * provider, and the resume text is never logged.
 */
export async function roastBaseResume(input: { jd?: string; id?: string } = {}): Promise<RoastResult> {
  // With an id this audits that saved profile snapshot instead of the base resume.
  const base = input.id ? await getResumeById(input.id) : await getBaseResume();
  if (!base) return { ok: false, error: input.id ? "That profile no longer exists" : "Save your resume first" };
  const settings = await getSettings();
  const level = effectiveRoastLevel(settings.roastLevel, settings.roastMode);
  const jd = input.jd?.trim().slice(0, 20_000) || undefined;
  const ats = scoreResume(base.text, { jd });
  const rules = (): RoastResult => ({ ok: true, roast: roastFromRules(ats, level), source: "rules", cached: false });

  const res = await runAi("resume-roast", {}, (llm) =>
    cachedAi(
      { feature: "resume-roast", version: ROAST_PROMPT_VERSION, input: JSON.stringify([base.text, jd ?? "", level]), ttlDays: 7, schema: resumeRoastSchema, timeZone: env().APP_TIMEZONE },
      async () => ({ value: await llm.generateJson(roastPrompt({ resume: base.text, jd, level, ats }), resumeRoastSchema), provider: llm.lastProvider }),
    ),
  );
  if (!res.ok) return rules();
  return { ok: true, roast: res.data.value, source: "ai", cached: res.data.cached, provider: res.data.provider ?? res.provider };
}

/* -------------------------------------- versions -------------------------------------- */

export const MAX_VERSIONS = 12;

export async function listVersions(): Promise<ResumeDto[]> {
  await connectDb();
  const docs = await Resume.find({ kind: "version" }).sort({ updatedAt: -1 }).lean();
  return docs.map(toDto);
}

/** Any resume (the base or a version) by id, or null for a bad or unknown id. */
export async function getResumeById(id: string): Promise<ResumeDto | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDb();
  const d = await Resume.findById(id).lean();
  return d ? toDto(d) : null;
}

export interface NewVersion {
  label: string;
  company?: string;
  role?: string;
  jd?: string;
  text: string;
}

export async function createVersion(input: NewVersion): Promise<ResumeDto> {
  const text = input.text.replace(/\r/g, "").replace(/\u0000/g, "").trim();
  if (text.length < 50) throw new Error("That is too short to be a resume");
  if (text.length > RESUME_TEXT_MAX) throw new Error(`Keep it under ${RESUME_TEXT_MAX.toLocaleString()} characters`);
  await connectDb();
  if ((await Resume.countDocuments({ kind: "version" })) >= MAX_VERSIONS) throw new Error(`You can keep ${MAX_VERSIONS} tailored versions. Delete one first`);
  const d = await Resume.create({
    kind: "version",
    label: input.label.trim().slice(0, 120) || "Tailored resume",
    company: (input.company ?? "").trim().slice(0, 120),
    role: (input.role ?? "").trim().slice(0, 160),
    jd: (input.jd ?? "").trim().slice(0, 20_000),
    text,
  });
  return toDto(d.toObject());
}

export async function deleteVersion(id: string): Promise<void> {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error("Unknown resume");
  await connectDb();
  await Resume.deleteOne({ _id: id, kind: { $in: ["version", "profile"] } });
}

/* -------------------------------------- tailoring -------------------------------------- */

export type TailorResult =
  | { ok: true; changes: Change[]; rejected: Rejected[]; source: "ai" | "rules"; missing: string[] }
  | { ok: false; error: string };

/**
 * Proposes changes that aim your saved resume at a job. Every proposal is checked against the facts in the
 * resume (see `validateTailor`), so nothing invented reaches you. With no AI available the only change is
 * putting the skills the job names first. Never uses the paid provider.
 */
export async function tailorBaseResume(input: { jd: string; approved?: string[] }): Promise<TailorResult> {
  const base = await getBaseResume();
  if (!base) return { ok: false, error: "Save your resume first" };
  const jd = input.jd.trim().slice(0, 20_000);
  if (jd.length < 80) return { ok: false, error: "Paste the full job description" };
  const approved = [...new Set((input.approved ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
  const doc = parseResumeText(base.text);
  const missing = scoreResume(base.text, { jd, doc }).missing;

  const res = await runAi("resume-tailor", {}, (llm) => llm.generateJson(tailorPrompt({ doc, jd, approved, missing }), tailorSchema));
  const patch = res.ok ? res.data : { skillsFirst: skillsFirstFor(doc, jd), bullets: [] as TailorPatch["bullets"] };
  const { changes, rejected } = validateTailor({ ...patch, skillsFirst: res.ok ? patch.skillsFirst : skillsFirstFor(doc, jd) }, doc, base.text, approved);
  return { ok: true, changes, rejected, source: res.ok ? "ai" : "rules", missing };
}

/* ------------------------------------ profile snapshots ------------------------------------ */

export const MAX_PROFILES = 6;

/** Saves the text of your own profile page (captured by the extension) so it can be scored and roasted like a resume. The oldest is dropped past the cap. */
export async function saveProfileSnapshot(input: { title: string; url: string; text: string }): Promise<ResumeDto> {
  await connectDb();
  const host = (() => {
    try {
      return new URL(input.url).hostname.replace(/^www\./, "");
    } catch {
      return "profile";
    }
  })();
  const d = await Resume.create({ kind: "profile", label: `${host} profile`.slice(0, 120), role: input.title.slice(0, 160), jd: input.url.slice(0, 500), text: input.text.slice(0, RESUME_TEXT_MAX) });
  const extra = await Resume.find({ kind: "profile" }).sort({ createdAt: -1, _id: -1 }).skip(MAX_PROFILES).select("_id").lean();
  if (extra.length) await Resume.deleteMany({ _id: { $in: extra.map((e) => e._id) } });
  return toDto(d.toObject());
}

export async function listProfiles(): Promise<ResumeDto[]> {
  await connectDb();
  return (await Resume.find({ kind: "profile" }).sort({ createdAt: -1, _id: -1 }).lean()).map(toDto);
}
