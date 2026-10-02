import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
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
      <ReactMarkdown skipHtml components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
