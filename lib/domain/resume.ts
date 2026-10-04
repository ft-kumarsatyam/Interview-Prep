/**
 * The resume as data: a zod shape the rest of the feature works on, and a forgiving parser that turns the
 * text pulled out of a PDF or DOCX into it. Pure. Parsing is a best effort, so the UI always shows the
 * extracted text for you to fix before anything is scored.
 */
import { z } from "zod";

export const RESUME_TEXT_MAX = 60_000;

const line = (max: number) => z.string().trim().max(max);
export const resumeSchema = z.object({
  contact: z.object({
    name: line(120).default(""),
    email: line(160).default(""),
    phone: line(40).default(""),
    location: line(120).default(""),
    links: z.array(line(200)).max(8).default([]),
  }),
  summary: line(1500).default(""),
  skills: z.array(line(60)).max(80).default([]),
  experience: z
    .array(z.object({ company: line(120).default(""), role: line(120).default(""), dates: line(60).default(""), bullets: z.array(line(500)).max(20).default([]) }))
    .max(20)
    .default([]),
  projects: z.array(z.object({ name: line(120).default(""), stack: line(160).default(""), bullets: z.array(line(500)).max(12).default([]) })).max(15).default([]),
  education: z.array(z.object({ school: line(160).default(""), degree: line(160).default(""), dates: line(60).default("") })).max(8).default([]),
  extras: z.array(line(300)).max(30).default([]),
});
export type ResumeDoc = z.infer<typeof resumeSchema>;

export type SectionId = "summary" | "experience" | "projects" | "education" | "skills" | "extras";

const HEADINGS: Array<[SectionId, RegExp]> = [
  ["summary", /^(professional\s+)?(summary|profile|objective|about( me)?|career objective)$/i],
  ["experience", /^((professional|work|relevant|industry)\s+)?(experience|employment( history)?|work history|internships?)$/i],
  ["projects", /^((personal|academic|key|selected|notable)\s+)?projects?$/i],
  ["education", /^(education|academics?|academic background|qualifications?|education (&|and) training)$/i],
  ["skills", /^((technical|core|key)\s+)?(skills|technologies|tech stack|competencies|skills (&|and) tools)$/i],
  ["extras", /^(certifications?|achievements?|awards?|honou?rs|publications?|positions? of responsibility|extra[- ]?curriculars?|activities|interests|languages|courses|open[- ]source|volunteering)$/i],
];

/** A heading is a short line that matches a known section name, ignoring colons, caps and decoration. */
export function headingOf(raw: string): SectionId | null {
  const t = raw.replace(/[:|•\-–—_*#]+/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 3 || t.length > 40) return null;
  return HEADINGS.find(([, re]) => re.test(t))?.[0] ?? null;
}

export const BULLET = /^\s*(?:[•●▪■◦○▫‣∙·*]|[-–—]\s|\d{1,2}[.)]\s)\s*/;
export const isBullet = (l: string) => BULLET.test(l);
export const stripBullet = (l: string) => l.replace(BULLET, "").trim();

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)\d{3}[\s-]?\d{3,4}\b/;
const URLISH = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/[\w/%-]+|github\.com\/[\w-]+(?:\/[\w.-]+)?|[\w-]+\.(?:dev|io|me|tech|app)\b[\w/.-]*|leetcode\.com\/[\w-]+|gitlab\.com\/[\w-]+)/gi;
export const DATE_RANGE = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*)?(?:19|20)\d{2}|present|current|now|ongoing)\b/i;

const splitHeader = (l: string): { company: string; role: string; dates: string } => {
  const dates = l.match(DATE_RANGE)?.[0] ?? "";
  const rest = l.replace(DATE_RANGE, "").replace(/[()|]+\s*$/g, "").trim();
  const parts = rest.split(/\s+(?:\||@|at|—|–|-)\s+|\s*\|\s*|\s*,\s+/).map((p) => p.trim()).filter(Boolean);
  return { role: parts[0] ?? "", company: parts[1] ?? "", dates };
};

/** Best-effort structure from resume text. Never throws; unknown input just yields an emptier document. */
export function parseResumeText(text: string): ResumeDoc {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/g, ""));
  const nonEmpty = lines.filter((l) => l.trim());
  const flat = nonEmpty.join("\n");

  const email = flat.match(EMAIL)?.[0] ?? "";
  const phone = flat.match(PHONE)?.[0]?.trim() ?? "";
  const links = [...new Set((flat.match(URLISH) ?? []).map((u) => u.replace(/[.,;)]+$/, "")))].filter((u) => !email.includes(u)).slice(0, 8);
  const top = nonEmpty[0]?.trim() ?? "";
  const name = top && !EMAIL.test(top) && !/\d/.test(top) && top.split(/\s+/).length <= 5 && !headingOf(top) ? top : "";

  const doc: ResumeDoc = { contact: { name, email, phone, location: "", links }, summary: "", skills: [], experience: [], projects: [], education: [], extras: [] };

  let section: SectionId | null = null;
  const buckets: Record<SectionId, string[]> = { summary: [], experience: [], projects: [], education: [], skills: [], extras: [] };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const h = headingOf(l);
    if (h) {
      section = h;
      continue;
    }
    if (section) buckets[section].push(l);
  }

  doc.summary = buckets.summary.join(" ").slice(0, 1500);
  doc.skills = [...new Set(buckets.skills.flatMap((l) => stripBullet(l).replace(/^[A-Za-z &/]{2,30}:\s*/, "").split(/[,;|•·]\s*|\s{2,}/)).map((s) => s.trim()).filter((s) => s && s.length <= 40))].slice(0, 80);

  const entries = (rows: string[]) => {
    const out: Array<{ head: string; bullets: string[] }> = [];
    for (const l of rows) {
      if (isBullet(l)) {
        (out.at(-1) ?? out[out.push({ head: "", bullets: [] }) - 1]!).bullets.push(stripBullet(l));
      } else if (out.length && out.at(-1)!.bullets.length > 0 && !DATE_RANGE.test(l) && (l.split(/\s+/).length > 6 || /^[a-z0-9(%,.;)]/.test(l))) {
        // A long unmarked line after bullets continues the last bullet (PDF line wrap).
        const last = out.at(-1)!;
        last.bullets[last.bullets.length - 1] += ` ${l}`;
      } else if (out.length && out.at(-1)!.bullets.length === 0 && !DATE_RANGE.test(out.at(-1)!.head) && DATE_RANGE.test(l)) {
        out.at(-1)!.head += ` ${l}`;
      } else {
        out.push({ head: l, bullets: [] });
      }
    }
    return out;
  };

  doc.experience = entries(buckets.experience)
    .slice(0, 20)
    .map((e) => ({ ...splitHeader(e.head), bullets: e.bullets.slice(0, 20) }));
  doc.projects = entries(buckets.projects)
    .slice(0, 15)
    .map((e) => {
      const [name = "", stack = ""] = e.head.split(/\s*(?:\||—|–|:|\()\s*/);
      return { name: name.trim(), stack: stack.replace(/\)$/, "").trim(), bullets: e.bullets.slice(0, 12) };
    });
  doc.education = buckets.education
    .filter((l) => !isBullet(l))
    .slice(0, 8)
    .map((l) => {
      const dates = l.match(DATE_RANGE)?.[0] ?? l.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
      const rest = l.replace(DATE_RANGE, "").trim();
      const [school = "", degree = ""] = rest.split(/\s*[|,–—-]\s+/);
      return { school, degree, dates };
    });
  doc.extras = buckets.extras.map(stripBullet).filter(Boolean).slice(0, 30);

  return resumeSchema.parse(doc);
}

/** Every bullet in the resume, tagged with where it sits. */
export function allBullets(doc: ResumeDoc): Array<{ where: string; text: string }> {
  return [
    ...doc.experience.flatMap((e) => e.bullets.map((text) => ({ where: e.company || e.role || "Experience", text }))),
    ...doc.projects.flatMap((p) => p.bullets.map((text) => ({ where: p.name || "Project", text }))),
  ];
}

export const wordsIn = (text: string): number => text.match(/[\p{L}\p{N}][\p{L}\p{N}'’+#./-]*/gu)?.length ?? 0;
