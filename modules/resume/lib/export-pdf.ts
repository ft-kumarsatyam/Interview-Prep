import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ResumeDoc } from "@/modules/resume/domain/resume";

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 46, top: 46, bottom: 46 };

/** The standard PDF fonts only cover Latin-1 text, so anything else (₹, emoji, smart dashes) becomes a safe stand-in. */
function safe(font: PDFFont, text: string): string {
  const allowed = new Set(font.getCharacterSet());
  const map: Record<string, string> = { "₹": "Rs. ", "→": "->", "…": "...", " ": " ", "‑": "-" };
  return [...text.replace(/\s+/g, " ")].map((ch) => map[ch] ?? (allowed.has(ch.codePointAt(0)!) ? ch : "")).join("");
}

/** A one-column PDF with real, selectable text in reading order (no images, tables or columns), so an ATS can extract it. */
export async function resumeToPdf(doc: ResumeDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const c = doc.contact;
  pdf.setTitle(c.name || "Resume");
  pdf.setAuthor(c.name || "");

  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M.top;
  const width = A4.w - M.x * 2;

  const need = (h: number) => {
    if (y - h < M.bottom) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - M.top;
    }
  };
  const wrap = (text: string, font: PDFFont, size: number, maxW: number): string[] => {
    const lines: string[] = [];
    let cur = "";
    for (const word of safe(font, text).split(" ").filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const text = (t: string, o: { font?: PDFFont; size?: number; indent?: number; gap?: number; center?: boolean; color?: [number, number, number]; bullet?: boolean } = {}) => {
    const font = o.font ?? regular;
    const size = o.size ?? 10;
    const indent = o.indent ?? 0;
    const lines = wrap(t, font, size, width - indent);
    lines.forEach((l, i) => {
      need(size * 1.35);
      y -= size * 1.35;
      const x = o.center ? (A4.w - font.widthOfTextAtSize(l, size)) / 2 : M.x + indent;
      if (o.bullet && i === 0) page.drawText("•", { x: M.x + indent - 11, y, size, font: regular });
      page.drawText(l, { x, y, size, font, color: rgb(...(o.color ?? [0.1, 0.1, 0.1])) });
    });
    y -= o.gap ?? 0;
  };
  const heading = (t: string) => {
    need(30);
    y -= 8;
    text(t.toUpperCase(), { font: bold, size: 10.5, gap: 1 });
    page.drawLine({ start: { x: M.x, y: y + 2 }, end: { x: A4.w - M.x, y: y + 2 }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
    y -= 3;
  };

  if (c.name) text(c.name, { font: bold, size: 18, center: true, gap: 2 });
  const line = [c.email, c.phone, c.location, ...c.links].filter(Boolean).join("  |  ");
  if (line) text(line, { size: 9, center: true, color: [0.3, 0.3, 0.3] });
  if (doc.summary) {
    heading("Summary");
    text(doc.summary);
  }
  if (doc.skills.length) {
    heading("Skills");
    text(doc.skills.join(", "));
  }
  if (doc.experience.length) {
    heading("Experience");
    for (const e of doc.experience) {
      y -= 3;
      text([e.role, e.company].filter(Boolean).join(", ") + (e.dates ? `   ${e.dates}` : ""), { font: bold });
      for (const b of e.bullets) text(b, { indent: 14, bullet: true, gap: 1 });
    }
  }
  if (doc.projects.length) {
    heading("Projects");
    for (const p of doc.projects) {
      y -= 3;
      text(p.name + (p.stack ? `   ${p.stack}` : ""), { font: bold });
      for (const b of p.bullets) text(b, { indent: 14, bullet: true, gap: 1 });
    }
  }
  if (doc.education.length) {
    heading("Education");
    for (const e of doc.education) text([e.school, e.degree].filter(Boolean).join(", ") + (e.dates ? `   ${e.dates}` : ""), { font: bold, gap: 1 });
  }
  if (doc.extras.length) {
    heading("Additional");
    for (const x of doc.extras) text(x, { indent: 14, bullet: true });
  }
  return pdf.save();
}
