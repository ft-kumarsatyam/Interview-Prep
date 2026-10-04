import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/dal";
import { parseResumeText } from "@/lib/domain/resume";
import { resumeToDocx } from "@/lib/resume/export-docx";
import { resumeToPdf } from "@/lib/resume/export-pdf";
import { getResumeById } from "@/lib/services/resume";

export const maxDuration = 30;

const safeName = (s: string) => s.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "resume";

/** `?format=pdf|docx|txt` of the base resume or a tailored version. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/resume/[id]/download">) {
  await requireSession();
  const { id } = await ctx.params;
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  if (!["pdf", "docx", "txt"].includes(format)) return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  const resume = await getResumeById(id);
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = parseResumeText(resume.text);
  const base = safeName([doc.contact.name, resume.company, resume.role].filter(Boolean).join(" ") || resume.label);
  const headers = (type: string) => ({ "Content-Type": type, "Content-Disposition": `attachment; filename="${base}.${format}"`, "Cache-Control": "no-store" });

  if (format === "docx") return new NextResponse(new Uint8Array(await resumeToDocx(doc)), { headers: headers("application/vnd.openxmlformats-officedocument.wordprocessingml.document") });
  if (format === "txt") return new NextResponse(resume.text, { headers: headers("text/plain; charset=utf-8") });
  return new NextResponse(Buffer.from(await resumeToPdf(doc)), { headers: headers("application/pdf") });
}
