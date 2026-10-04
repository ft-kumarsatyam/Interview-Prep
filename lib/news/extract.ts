import "server-only";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { fetchSafe, SafeFetchError } from "@/lib/http-safe";
import { firstImage, htmlToMarkdown } from "./markdown";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;

export interface Extracted {
  markdown: string;
  leadImage: string | null;
}

export type Extractor = (url: string) => Promise<Extracted>;

export class ExtractError extends Error {}

/** Fetches the page through the shared SSRF-safe fetcher and keeps extractor-flavoured errors. */
async function fetchHtml(start: string): Promise<{ html: string; finalUrl: string }> {
  try {
    const res = await fetchSafe(start, { timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES, accept: /html/i, headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" } });
    return { html: res.text, finalUrl: res.finalUrl };
  } catch (err) {
    if (err instanceof SafeFetchError) throw new ExtractError(err.message.replace("Response too large", "Page too large").replace("Unexpected content type", "Not an HTML page"));
    throw err;
  }
}

function metaImage(document: Document, base: string): string | null {
  const raw =
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
    document.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
  if (!raw) return null;
  try {
    const u = new URL(raw, base);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Fetch an article page and keep only the main text (Mozilla Readability), as markdown. */
export const extractArticle: Extractor = async (url) => {
  const { html, finalUrl } = await fetchHtml(url);
  const { document } = parseHTML(html);
  const leadFromMeta = metaImage(document as unknown as Document, finalUrl);
  const article = new Readability(document as unknown as Document, { charThreshold: 400 }).parse();
  if (!article?.content) throw new ExtractError("No readable article on the page");
  const markdown = htmlToMarkdown(article.content, finalUrl);
  if (markdown.length < 400) throw new ExtractError("Readable text too short");
  return { markdown, leadImage: leadFromMeta ?? firstImage(markdown) };
};
