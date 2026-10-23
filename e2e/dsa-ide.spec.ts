import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const editor = (page: Page) => page.locator(".cm-content").first();

async function replaceCode(page: Page, code: string) {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(code);
}

const GOOD = "function twoSum(nums, target) { const m = new Map(); for (let i = 0; i < nums.length; i++) { const j = m.get(target - nums[i]); if (j !== undefined) return [j, i]; m.set(nums[i], i); } return []; }";

test.describe("DSA problem IDE", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/dsa/two-sum");
    await expect(editor(page)).toBeVisible();
  });

  test("a correct solution is Accepted (hidden cases judged by hash) and the run shows under Runs", async ({ page }) => {
    await replaceCode(page, GOOD);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Accepted", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/11\/11 cases passed/)).toBeVisible();
    // An accepted submit opens the "log this solve" sheet; close it to reach the History tab behind it.
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Runs" }).click();
    await expect(page.getByText("submit").first()).toBeVisible({ timeout: 15_000 });
  });

  test("a wrong solution fails the hidden cases and the page never ships their answers", async ({ page }) => {
    const sealed = page.waitForResponse((r) => r.url().includes("/dsa/two-sum") && r.request().method() === "GET");
    await page.reload();
    const body = await (await sealed).text();
    expect(body).toContain("expectedHash");
    await replaceCode(page, "function twoSum(nums, target) { return [0, 0]; }");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Wrong answer", { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("a crash points at its line in your code", async ({ page }) => {
    await replaceCode(page, "function twoSum(nums, target) {\n  return missingHelper(nums, target);\n}");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByText("Wrong answer", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Go to line 2" })).toBeVisible();
    await expect(page.locator(".cm-lintRange-error, .cm-lint-marker-error").first()).toBeVisible();
  });
});
