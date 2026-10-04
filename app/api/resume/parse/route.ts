import { NextResponse } from "next/server";
import { requireSession } from "@/core/auth/dal";
import { RESUME_TEXT_MAX } from "@/modules/resume/domain/resume";
import { limited } from "@/core/services/rate-limit";

export const maxDuration = 30;

/** Vercel Hobby caps request bodies near 4.5 MB, so stay under it. */
const MAX_BYTES = 3 * 1024 * 1024;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * Pulls the text out of an uploaded PDF, DOCX or TXT so you can check and fix it before saving. Nothing
 * is stored here and the file is never written to disk or logged.
 */
export async function POST(req: Request) {
  await requireSession();
  const wait = await limited("resumeParse");
  if (wait) return fail(wait, 429);
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return fail("Upload a PDF, DOCX or TXT file");
  }
  if (!file) return fail("Upload a PDF, DOCX or TXT file");
  if (file.size === 0) return fail("That file is empty");
  if (file.size > MAX_BYTES) return fail("That file is over 3 MB. Export a smaller PDF or paste the text instead.", 413);

  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  try {
    let text = "";
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      if (String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") return fail("That doesn't look like a real PDF");
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(buf) })).value;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      text = new TextDecoder().decode(buf);
    } else {
      return fail("Use a PDF, DOCX or TXT file");
    }
    text = text.replace(/\r/g, "").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 50) return fail("No text found. A scanned or image-only PDF can't be read: paste the text instead.", 422);
    return NextResponse.json({ ok: true, text: text.slice(0, RESUME_TEXT_MAX), truncated: text.length > RESUME_TEXT_MAX });
  } catch {
    return fail("Couldn't read that file. Try exporting it again, or paste the text.", 422);
  }
}
