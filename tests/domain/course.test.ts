import { describe, expect, it } from "vitest";
import { proseOnly } from "@/modules/course/domain/course";

describe("proseOnly", () => {
  it("drops fenced and inline code so tags shown as code are not mistaken for raw HTML", () => {
    const md = "Use `</script>` carefully.\n\n```html\n<img src=\"a.png\">\n```\n\nThen <script>alert(1)</script>.";
    const prose = proseOnly(md);
    expect(prose).not.toContain("<img");
    expect(prose).not.toContain("`</script>`");
    expect(prose).toContain("<script>alert(1)</script>");
  });
});
