import { AlignmentType, Document, LevelFormat, Packer, Paragraph, TextRun } from "docx";
import type { ResumeDoc } from "@/modules/resume/domain/resume";

const FONT = "Calibri";
const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, font: FONT, size: o.size ?? 21, ...(o.bold ? { bold: true } : {}), ...(o.color ? { color: o.color } : {}) });

/** A single-column, plain-style DOCX: real paragraphs and real list bullets, no tables or text boxes, so ATS software reads it in order. */
export async function resumeToDocx(doc: ResumeDoc): Promise<Buffer> {
  const c = doc.contact;
  const out: Paragraph[] = [];
  const heading = (t: string) => out.push(new Paragraph({ spacing: { before: 200, after: 60 }, border: { bottom: { style: "single", size: 4, color: "999999", space: 1 } }, children: [run(t.toUpperCase(), { bold: true, size: 22 })] }));
  const bullet = (t: string) => out.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 30 }, children: [run(t)] }));

  if (c.name) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(c.name, { bold: true, size: 32 })] }));
  const line = [c.email, c.phone, c.location, ...c.links].filter(Boolean).join("  |  ");
  if (line) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run(line, { size: 19 })] }));
  if (doc.summary) {
    heading("Summary");
    out.push(new Paragraph({ children: [run(doc.summary)] }));
  }
  if (doc.skills.length) {
    heading("Skills");
    out.push(new Paragraph({ children: [run(doc.skills.join(", "))] }));
  }
  if (doc.experience.length) {
    heading("Experience");
    for (const e of doc.experience) {
      out.push(new Paragraph({ spacing: { before: 80, after: 20 }, keepNext: true, children: [run([e.role, e.company].filter(Boolean).join(", "), { bold: true }), ...(e.dates ? [run(`   ${e.dates}`, { color: "555555" })] : [])] }));
      e.bullets.forEach(bullet);
    }
  }
  if (doc.projects.length) {
    heading("Projects");
    for (const p of doc.projects) {
      out.push(new Paragraph({ spacing: { before: 80, after: 20 }, keepNext: true, children: [run(p.name, { bold: true }), ...(p.stack ? [run(`   ${p.stack}`, { color: "555555" })] : [])] }));
      p.bullets.forEach(bullet);
    }
  }
  if (doc.education.length) {
    heading("Education");
    for (const e of doc.education) out.push(new Paragraph({ spacing: { after: 30 }, children: [run([e.school, e.degree].filter(Boolean).join(", "), { bold: true }), ...(e.dates ? [run(`   ${e.dates}`, { color: "555555" })] : [])] }));
  }
  if (doc.extras.length) {
    heading("Additional");
    doc.extras.forEach(bullet);
  }

  const file = new Document({
    creator: c.name || "PrepOS",
    title: `${c.name || "Resume"}`,
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 864, right: 864 } } }, children: out }],
  });
  return Packer.toBuffer(file);
}
