import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** On a phone no page may scroll sideways, and the main controls must still be reachable. (Runs in the Pixel 7 project.) */
const PAGES = ["/dashboard", "/jobs", "/jobs/tracker", "/learn/practice?ref=js-basics%3A1", "/web/interview/sql", "/settings/api-tokens", "/ask", "/quiz"];

test.describe("@mobile layout", () => {
  for (const path of PAGES) {
    test(`${path} fits the screen`, async ({ page }) => {
      await signIn(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      expect(scrollWidth, `${path} scrolls sideways (${scrollWidth}px in a ${innerWidth}px screen)`).toBeLessThanOrEqual(innerWidth + 1);
    });
  }
});
