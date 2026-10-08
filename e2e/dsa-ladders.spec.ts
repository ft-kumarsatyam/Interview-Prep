import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test.describe("DSA ladders", () => {
  test("the Array Ladder opens its problems inside PrepOS", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page);
    await page.goto("/dsa?tab=sheets&sheet=ladder-arrays");
    const open = page.locator('a[href^="/dsa/sum-of-array-elements?sheet=ladder-arrays"]:visible').first();
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/\/dsa\/sum-of-array-elements\?sheet=ladder-arrays/);
    await expect(page.getByRole("link", { name: /^Back to Array Ladder/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a topic ladder opens a design problem with its back link", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page);
    await page.goto("/dsa?tab=sheets&sheet=ladder-tries");
    const open = page.locator('a[href^="/dsa/counting-words-with-a-given-prefix?sheet=ladder-tries"]:visible').first();
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/\/dsa\/counting-words-with-a-given-prefix\?sheet=ladder-tries/);
    await expect(page.getByRole("link", { name: /^Back to Tries Ladder/ })).toBeVisible();
    await page.goto("/dsa/implement-trie-prefix-tree?sheet=ladder-tries");
    await expect(page.getByRole("heading", { name: "Implement Trie (Prefix Tree)" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Back to Tries Ladder/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an authored A2Z problem shows its own statement and no LeetCode submit", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page);
    await page.goto("/dsa/celebrity-problem?sheet=striver-a2z");
    await expect(page.getByRole("heading", { name: "The Celebrity Problem" })).toBeVisible();
    await expect(page.getByText("Written for PrepOS.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy code + open LeetCode" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open on takeUforward" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a LeetCode-backed extra keeps the LeetCode submit", async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page);
    await page.goto("/dsa/perfect-number?sheet=striver-a2z");
    await expect(page.getByRole("link", { name: "Open on LeetCode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy code + open LeetCode" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("ladder cards and problem pages fit a phone screen @mobile", async ({ page }) => {
    await signIn(page);
    for (const path of ["/dsa?tab=sheets&sheet=ladder-arrays", "/dsa?tab=sheets&sheet=ladder-tries", "/dsa/celebrity-problem?sheet=striver-a2z"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });
});
