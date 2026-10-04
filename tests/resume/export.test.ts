import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { parseResumeText } from "@/lib/domain/resume";
import { renderResumeText } from "@/lib/domain/resume-tailor";
import { resumeToDocx } from "@/lib/resume/export-docx";
import { resumeToPdf } from "@/lib/resume/export-pdf";

const DOC = parseResumeText(`Aarav Sharma
aarav@example.com | +91 98765 43210 | github.com/aarav
SUMMARY
Backend engineer who saved ₹5 lakh a year 🚀 with caching.
SKILLS
Node.js, PostgreSQL, Redis
EXPERIENCE
Software Engineer | Acme Pay | Jun 2022 - Present
• Built a payments API in Node.js handling 2M requests per day with p99 under 120 ms
• Reduced checkout latency by 38% with Redis caching
EDUCATION
B.Tech Computer Science, NIT Trichy | 2018 - 2022`);

describe("downloads", () => {
  it("DOCX opens and reads back in order", async () => {
    const buf = await resumeToDocx(DOC);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const text = (await mammoth.extractRawText({ buffer: buf })).value;
    expect(text.indexOf("Aarav Sharma")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text).toContain("Reduced checkout latency by 38%");
    expect(text.indexOf("EXPERIENCE")).toBeLessThan(text.indexOf("EDUCATION"));
  });

  it("PDF is real, selectable text in reading order, with unsupported characters made safe", async () => {
    const bytes = await resumeToPdf(DOC);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
    expect(text.indexOf("Aarav Sharma")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text).toContain("Reduced checkout latency by 38%");
    expect(text).toContain("Rs.");
    expect(text).not.toContain("🚀");
    // The PDF scores like the source: an ATS parsing it back finds the same sections.
    const back = parseResumeText(text);
    expect(back.experience[0]!.bullets).toHaveLength(2);
    expect(back.contact.email).toBe("aarav@example.com");
  });

  it("long resumes flow onto more pages instead of clipping", async () => {
    const long = { ...DOC, experience: [{ company: "Co", role: "Eng", dates: "2020 - 2022", bullets: Array.from({ length: 19 }, (_, i) => `Delivered feature ${i} that improved the onboarding funnel for several million monthly active users across web and mobile`) }] };
    const bytes = await resumeToPdf({ ...long, projects: [{ name: "P", stack: "Node.js", bullets: long.experience[0]!.bullets.slice(0, 12) }] });
    const pdf = await getDocumentProxy(bytes);
    expect(pdf.numPages).toBeGreaterThan(1);
    const { text } = await extractText(pdf, { mergePages: true });
    expect(text).toContain("Delivered feature 18");
  });

  it("renderResumeText matches what the parser expects", () => {
    expect(renderResumeText(DOC)).toContain("EXPERIENCE\nSoftware Engineer | Acme Pay | Jun 2022 - Present\n• Built");
  });
});
