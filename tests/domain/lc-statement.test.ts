import { describe, expect, it } from "vitest";
import { leetcodeHtmlToMarkdown, restrictImages } from "@/lib/leetcode/statement";

const md = leetcodeHtmlToMarkdown;

describe("leetcodeHtmlToMarkdown", () => {
  it("converts a typical statement", () => {
    const out = md(
      '<p>Given an array <code>nums</code> and <em>target</em>, return indices.</p><p><strong class="example">Example 1:</strong></p><pre><strong>Input:</strong> nums = [2,7]\n<strong>Output:</strong> [0,1]</pre><ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li></ul>',
    );
    expect(out).toContain("`nums`");
    expect(out).toContain("*target*");
    expect(out).toContain("10^4");
    expect(out).toContain("Input:");
    expect(out).toContain("2 <= nums.length");
  });

  it("turns superscripts and subscripts into plain text", () => {
    expect(md("<p>2<sup>31</sup> - 1 and a<sub>i</sub></p>")).toContain("2^31 - 1 and a\\_i"); // `_` is escaped for markdown and renders as _
  });

  describe("hostile input", () => {
    it("drops scripts, styles, iframes, forms, embeds and svg entirely", () => {
      const out = md('<p>ok</p><script>alert(1)</script><style>body{}</style><iframe src="https://evil.example/x"></iframe><form action="/steal"><input name="q"></form><svg onload="alert(2)"><circle/></svg><object data="x"></object><embed src="y">');
      expect(out).toBe("ok");
      for (const bad of ["alert", "evil.example", "steal", "body{}", "onload"]) expect(out).not.toContain(bad);
    });

    it("drops javascript: and data: links but keeps the visible text", () => {
      const out = md('<a href="javascript:alert(1)">click me</a> <a href="data:text/html,<script>alert(1)</script>">data</a> <a href="vbscript:x">vb</a>');
      expect(out).toContain("click me");
      expect(out).not.toMatch(/javascript:|data:text|vbscript/i);
      expect(out).not.toContain("](");
    });

    it("keeps an https link and resolves a relative one against leetcode.com", () => {
      const out = md('<a href="https://example.com/x">ex</a> <a href="/problems/two-sum/">rel</a>');
      expect(out).toContain("[ex](https://example.com/x)");
      expect(out).toContain("[rel](https://leetcode.com/problems/two-sum/)");
    });

    it("never leaves event-handler text from an <img>", () => {
      const out = md('<img src="x" onerror="alert(1)" alt="a">');
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("alert");
    });

    it("omits images from other hosts, so a page can't beacon out through an image URL", () => {
      const out = md('<img src="https://evil.example/pixel.png?c=SECRET" alt="x"><img src="http://assets.leetcode.com/a.png"><img src="data:image/png;base64,AAAA">');
      expect(out).not.toContain("evil.example");
      expect(out).not.toContain("SECRET");
      expect(out).not.toContain("http://");
      expect(out).not.toContain("data:");
    });

    it("keeps an image hosted on LeetCode", () => {
      expect(md('<img src="https://assets.leetcode.com/uploads/2020/tree.jpg" alt="tree">')).toContain("![tree](https://assets.leetcode.com/uploads/2020/tree.jpg)");
    });

    it("escapes markdown a statement tries to smuggle in as text", () => {
      const out = md("<p>[click](javascript:alert(1)) and ![x](https://evil.example/p.png)</p>");
      expect(out).not.toMatch(/(?<!\\)\]\(javascript:/);
      expect(out).not.toMatch(/(?<!\\)!\[x\]\(https:\/\/evil/);
    });

    it("strips HTML comments", () => {
      expect(md("<p>a</p><!-- <script>alert(1)</script> -->")).toBe("a");
    });

    it("survives garbage and empty input", () => {
      expect(md("")).toBe("");
      expect(() => md("<<<>>><p><b>unclosed")).not.toThrow();
    });
  });

  it("caps a very long statement", () => {
    const out = md(`<p>${"word ".repeat(10_000)}</p>`);
    expect(out.length).toBeLessThan(12_200);
    expect(out).toContain("statement cut");
  });
});

describe("restrictImages", () => {
  it("only lets https LeetCode-hosted images through", () => {
    expect(restrictImages("![a](https://leetcode.com/x.png)")).toBe("![a](https://leetcode.com/x.png)");
    expect(restrictImages("![a](https://leetcode.com.evil.com/x.png)")).toBe("*(image omitted)*");
    expect(restrictImages("![a](http://leetcode.com/x.png)")).toBe("*(image omitted)*");
    expect(restrictImages("![a](not a url)")).toContain("omitted");
  });
});
