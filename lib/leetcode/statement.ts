import "server-only";
import { htmlToMarkdown } from "@/lib/news/markdown";

export const STATEMENT_MAX = 12_000;
/** Images in a statement (tree diagrams and the like) may only come from LeetCode itself. */
const IMAGE_HOSTS = new Set(["assets.leetcode.com", "leetcode.com", "www.leetcode.com", "s3-lc-upload.s3.amazonaws.com"]);

/** Keep an image only if it is https and on a LeetCode host; anything else becomes a plain note. */
export function restrictImages(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt: string, src: string) => {
    try {
      const u = new URL(src);
      return u.protocol === "https:" && IMAGE_HOSTS.has(u.hostname) ? `![${alt}](${u.toString()})` : "*(image omitted)*";
    } catch {
      return "*(image omitted)*";
    }
  });
}

/**
 * LeetCode statement HTML to safe markdown. The HTML is untrusted: scripts, iframes and forms are
 * dropped, links must be http(s), images must be LeetCode's own, and the reader renders the result
 * with react-markdown, which ignores any raw HTML that survives.
 */
export function leetcodeHtmlToMarkdown(html: string): string {
  const prepared = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, (_m, inner: string) => `^${inner.replace(/<[^>]+>/g, "")}`)
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, (_m, inner: string) => `_${inner.replace(/<[^>]+>/g, "")}`);
  const md = restrictImages(htmlToMarkdown(prepared, "https://leetcode.com"));
  return md.length > STATEMENT_MAX ? `${md.slice(0, STATEMENT_MAX).trimEnd()}\n\n*(statement cut. Open it on LeetCode for the rest)*` : md;
}
