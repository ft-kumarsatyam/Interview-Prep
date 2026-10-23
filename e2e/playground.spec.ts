import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const editor = (page: Page) => page.locator(".cm-content").first();
const fileTabs = (page: Page) => page.getByRole("tablist", { name: "Open files" }).getByRole("tab");

async function replaceCode(page: Page, code: string) {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(code);
}

test.describe("Playground tabs", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/playground");
    await page.evaluate(() => {
      localStorage.removeItem("playground:tabs");
      localStorage.removeItem("playground:scratch");
    });
    await page.reload();
    await expect(editor(page)).toBeVisible();
  });

  test("a new tab runs JavaScript and shows the output", async ({ page }) => {
    await page.getByRole("button", { name: "New tab" }).click();
    await expect(fileTabs(page)).toHaveCount(2);
    await replaceCode(page, "console.log('hello from tab 2');");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByText("hello from tab 2")).toBeVisible();
  });

  test("an error shows a Line button that reveals the failing line", async ({ page }) => {
    await replaceCode(page, "const a = 1;\nconsole.log(a);\nundefinedFn();");
    await page.keyboard.press("ControlOrMeta+Enter");
    const jump = page.getByRole("button", { name: /go to line 3/i });
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(page.locator(".cm-lintRange-error, .cm-lint-marker-error").first()).toBeVisible();
  });

  test("tabs persist after a reload", async ({ page }) => {
    await page.getByRole("button", { name: "New tab" }).click();
    await replaceCode(page, "console.log('kept');");
    await expect(page.getByText(/autosaved/)).toBeVisible();
    await page.waitForTimeout(700);
    await page.reload();
    await expect(fileTabs(page)).toHaveCount(2);
    await expect(page.getByRole("tablist", { name: "Open files" }).getByRole("tab", { selected: true })).toBeVisible();
    await expect(editor(page)).toContainText("kept");
  });

  test("the Format button rewrites messy JavaScript", async ({ page }) => {
    await replaceCode(page, "const   x={a:1,b:2}\nconsole.log( x )");
    await page.getByRole("button", { name: "Format code" }).click();
    await expect(editor(page)).toContainText("const x = { a: 1, b: 2 };");
  });

  test("one tab can require another", async ({ page }) => {
    await replaceCode(page, "exports.answer = 41 + 1;");
    await fileTabs(page).first().dblclick();
    await page.getByLabel("File name").fill("lib.js");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "New tab" }).click();
    await replaceCode(page, "console.log('answer', require('./lib').answer);");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByText("answer 42")).toBeVisible();
  });

  test("the snippet sidebar searches and filters", async ({ page }) => {
    await replaceCode(page, "console.log('needle');");
    await page.getByRole("button", { name: "Save snippet" }).click();
    await page.locator("#snippet-title").fill("Needle snippet");
    await page.locator("#snippet-tags").fill("e2e-search");
    await page.getByRole("button", { name: "Save snippet" }).last().click();
    const search = page.getByRole("searchbox", { name: "Search snippets" });
    await search.fill("needle snippet");
    await expect(page.getByRole("button", { name: /Needle snippet/ }).first()).toBeVisible();
    await search.fill("zzz-no-match");
    await expect(page.getByText("No snippets match.")).toBeVisible();
  });

  test("Python loads from the app's own files (CDN blocked) and input() reads the stdin box", async ({ page }) => {
    test.setTimeout(150_000);
    await page.route("**/cdn.jsdelivr.net/**", (route) => route.abort());
    await page.getByRole("button", { name: "PY", exact: true }).click();
    await replaceCode(page, "print('hi ' + input())");
    await page.getByRole("button", { name: /Input \(stdin\)/ }).click();
    await page.getByLabel("Standard input").fill("Ada");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByText("hi Ada")).toBeVisible({ timeout: 120_000 });
  });

  test("a Python error shows its line, and a runaway loop is stopped and Python recovers", async ({ page }) => {
    test.setTimeout(240_000);
    await page.getByRole("button", { name: "PY", exact: true }).click();
    await replaceCode(page, "x = 1\ny = 2\nprint(undefined_name)");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByRole("button", { name: /go to line 3/i })).toBeVisible({ timeout: 120_000 });
    await replaceCode(page, "while True:\n    pass");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByText(/Killed after|still running after/i).first()).toBeVisible({ timeout: 60_000 });
    await replaceCode(page, "print('back again')");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.getByText("back again")).toBeVisible({ timeout: 60_000 });
  });
});
