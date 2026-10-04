import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

const components: Components = {
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th style={style} className="border-b bg-muted/50 px-3 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b px-3 py-2 align-top">
      {children}
    </td>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" && src.startsWith("https://") ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    ) : null,
};

/**
 * Stored article markdown. `skipHtml` drops any raw HTML left in the source
 * and react-markdown's default URL transform strips `javascript:` links, so
 * third-party text can't inject markup.
 */
export function ArticleMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose-notes prose-article">
      <ReactMarkdown skipHtml remarkPlugins={remarkPlugins} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
