import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** On a phone no page may scroll sideways, and the main controls must still be reachable. (Runs in the Pixel 7 project.) */
const PAGES = [
  "/dashboard",
  "/plan",
  "/calendar",
  "/targets",
  "/stats",
  "/jobs",
  "/jobs/tracker",
  "/resume",
  "/learn",
  "/practice",
  "/settings",
  "/setup",
  "/learn/practice?ref=js-basics%3A1",
  "/web/interview/sql",
  "/settings/api-tokens",
  "/ask",
  "/chat",
  "/quiz",
  "/dsa",
  "/dsa/sheets",
  "/dsa/sheets/fraz-250",
  "/dsa/sheets/sql",
  "/dsa/sheets/system-design",
  "/dsa/companies",
  "/dsa/companies/amazon",
];

test.describe("@mobile layout", () => {
  // The narrowest phone we support, narrower than the Pixel 7 the project emulates.
  test.use({ viewport: { width: 360, height: 780 } });

  for (const path of PAGES) {
    test(`${path} fits the screen`, async ({ page }) => {
      await signIn(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { scrollWidth, innerWidth, headerHeight } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        headerHeight: document.querySelector("header")?.getBoundingClientRect().height ?? 0,
      }));
      expect(scrollWidth, `${path} scrolls sideways (${scrollWidth}px in a ${innerWidth}px screen)`).toBeLessThanOrEqual(innerWidth + 1);
      expect(headerHeight, `${path} top bar wraps onto a second line`).toBeLessThanOrEqual(64);
      await expect(page.locator("nav.fixed[aria-label='Main']")).toBeVisible();
    });
  }

  test("the More sheet holds Career, Settings and the theme", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");
    await page.locator("nav.fixed[aria-label='Main']").getByRole("button", { name: "More" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("link", { name: "Jobs" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Resume" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Dark" })).toBeVisible();
  });
});
