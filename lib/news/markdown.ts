import "server-only";
import TurndownService from "turndown";
import { capContent } from "@/lib/domain/article";

const DROP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "FORM", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SVG", "CANVAS", "VIDEO", "AUDIO", "OBJECT", "EMBED"]);

function resolve(raw: string | null, base: string, protocols: readonly string[]): string | null {
  if (!raw || raw.startsWith("data:")) return null;
  try {
    const u = new URL(raw, base);
    return protocols.includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

const escapeAlt = (s: string) => s.replace(/[[\]\n]/g, " ").trim();

function service(base: string): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
  td.remove((node) => DROP.has(node.nodeName.toUpperCase()));
  td.addRule("safe-link", {
    filter: "a",
    replacement: (content, node) => {
      const href = resolve((node as HTMLElement).getAttribute("href"), base, ["http:", "https:"]);
      const text = content.trim();
      if (!text) return "";
      return href ? `[${text}](${href})` : text;
    },
  });
  td.addRule("safe-image", {
    filter: "img",
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const src = resolve(el.getAttribute("src") ?? el.getAttribute("data-src"), base, ["https:"]);
      return src ? `\n\n![${escapeAlt(el.getAttribute("alt") ?? "")}](${src})\n\n` : "";
    },
  });
  td.addRule("figcaption", {
    filter: "figcaption",
    replacement: (content) => (content.trim() ? `\n\n*${content.trim()}*\n\n` : ""),
  });
  return td;
}

/**
 * Article HTML (feed `content:encoded` or Readability output) to capped
 * markdown. Links are http(s) only and images https only, resolved against
 * the article URL; scripts, embeds and forms are dropped. The reader renders
 * the result with react-markdown, which ignores any raw HTML left over.
 */
export function htmlToMarkdown(html: string, baseUrl: string): string {
  const md = service(baseUrl)
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n");
  return capContent(md);
}

/** First https image in the markdown, used as the lead image when the page has no og:image. */
export function firstImage(markdown: string): string | null {
  return markdown.match(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;
}
