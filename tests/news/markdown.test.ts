import { describe, expect, it } from "vitest";
import { firstImage, htmlToMarkdown } from "@/modules/news/lib/markdown";

const BASE = "https://blog.example.com/posts/caching";

describe("htmlToMarkdown", () => {
  it("keeps structure: headings, lists, code and emphasis", () => {
    const md = htmlToMarkdown("<h2>Why</h2><p>Use a <em>cache</em>.</p><ul><li>one</li><li>two</li></ul><pre><code>get(k)</code></pre>", BASE);
    expect(md).toContain("## Why");
    expect(md).toContain("Use a *cache*.");
    expect(md).toMatch(/-\s+one/);
    expect(md).toContain("```\nget(k)\n```");
  });

  it("drops scripts, iframes, forms and inline handlers", () => {
    const md = htmlToMarkdown(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><iframe src="https://evil"></iframe><form><input value="x"></form><style>p{}</style>',
      BASE,
    );
    expect(md).toBe("Hi");
  });

  it("resolves relative links and strips unsafe protocols", () => {
    const md = htmlToMarkdown('<p><a href="/about">About</a> <a href="javascript:alert(1)">bad</a> <a href="mailto:a@b.c">mail</a></p>', BASE);
    expect(md).toContain("[About](https://blog.example.com/about)");
    expect(md).not.toContain("javascript:");
    expect(md).not.toContain("mailto:");
    expect(md).toContain("bad");
  });

  it("keeps https images only, resolving lazy-loaded sources", () => {
    const md = htmlToMarkdown(
      '<img src="/img/a.png" alt="A [diagram]"><img src="http://insecure/b.png"><img data-src="https://cdn.x/c.png"><img src="data:image/png;base64,AAA">',
      BASE,
    );
    expect(md).toContain("![A  diagram](https://blog.example.com/img/a.png)");
    expect(md).toContain("![](https://cdn.x/c.png)");
    expect(md).not.toContain("insecure");
    expect(md).not.toContain("data:");
    expect(firstImage(md)).toBe("https://blog.example.com/img/a.png");
  });
});
