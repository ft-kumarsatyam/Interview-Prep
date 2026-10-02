import "server-only";
import { lookup } from "node:dns/promises";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { isPrivateAddress, isSafeUrl } from "@/lib/domain/article";
import { firstImage, htmlToMarkdown } from "./markdown";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; PrepOS/1.0; personal reader)";

export interface Extracted {
  markdown: string;
  leadImage: string | null;
}

export type Extractor = (url: string) => Promise<Extracted>;

export class ExtractError extends Error {}

/** Every address the host resolves to must be public; blocks SSRF into the VPC or localhost. */
async function assertPublicHost(url: URL): Promise<void> {
  if (!isSafeUrl(url.toString())) throw new ExtractError("Blocked URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const answers = await lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some((a) => isPrivateAddress(a.address))) throw new ExtractError("Blocked address");
}

async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new ExtractError("Page too large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new ExtractError("Page too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Manual redirects so each hop goes through the SSRF check again. */
async function fetchHtml(start: string): Promise<{ html: string; finalUrl: string }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new ExtractError(`HTTP ${res.status} without Location`);
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new ExtractError(`HTTP ${res.status}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/html/i.test(type)) {
      await res.body?.cancel();
      throw new ExtractError(`Not an HTML page (${type.split(";")[0] || "unknown"})`);
    }
    return { html: await readCapped(res), finalUrl: url.toString() };
  }
  throw new ExtractError("Too many redirects");
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
