import { expect, test, type Page } from "@playwright/test";
import { DB_CHALLENGES } from "../modules/dsa/domain/db-lab";
import { signIn } from "./helpers";

const byId = (id: string) => DB_CHALLENGES.find((c) => c.id === id)!;

async function type(page: Page, text: string) {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.insertText(text);
}

test.describe("DB Lab catalogue", () => {
  test("the catalogue is organised by topic, searchable, and runs a challenge on its own dataset", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    await expect(page.getByRole("heading", { name: "DB Lab" })).toBeVisible();
    await expect(page.getByText(new RegExp(`${DB_CHALLENGES.length} challenges`))).toBeVisible();

    // Topics in teaching order, each with its own progress.
    const topics = page.getByRole("button", { expanded: true }).or(page.getByRole("button", { expanded: false }));
    await expect(topics.filter({ hasText: "Select, filter and sort" })).toBeVisible();
    await expect(topics.filter({ hasText: "Window functions" })).toBeVisible();
    await expect(topics.filter({ hasText: "Interview patterns" })).toBeVisible();

    // Search finds a challenge from another dataset and opening it switches the dataset.
    const c = byId("sql-longest-streak");
    await page.getByLabel("Search challenges").fill("streak");
    await page.getByRole("button", { name: new RegExp(c.title) }).click();
    await expect(page.locator("#db-lab-dataset")).toHaveValue("streaming");
    await expect(page.getByRole("paragraph").filter({ hasText: c.prompt })).toBeVisible();

    // A wrong answer is refused, the reference answer is accepted.
    await type(page, "SELECT 1 AS wrong");
    await page.getByRole("button", { name: /^Check/ }).click();
    await expect(page.getByText(/Solved: /)).toHaveCount(0);
    await type(page, c.solution);
    await page.getByRole("button", { name: /^Check/ }).click();
    await expect(page.getByText(`Solved: ${c.title}`)).toBeVisible({ timeout: 30_000 });
  });

  test("solved challenges are remembered, counted per topic, and survive a reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    const c = byId("sql-longest-streak");
    await page.getByLabel("Search challenges").fill("streak");
    await page.getByRole("button", { name: new RegExp(c.title) }).click();
    await type(page, c.solution);
    await page.getByRole("button", { name: /^Check/ }).click();
    await expect(page.getByText(`Solved: ${c.title}`)).toBeVisible({ timeout: 30_000 });
    const row = page.getByRole("button", { name: new RegExp(c.title) });
    await expect(row.getByLabel("Solved")).toBeVisible();
    await page.reload();
    await page.getByLabel("Search challenges").fill("streak");
    await expect(page.getByRole("button", { name: new RegExp(c.title) }).getByLabel("Solved")).toBeVisible();
    // The topic that holds it shows 1 solved.
    await page.getByLabel("Search challenges").fill("");
    await expect(page.getByRole("button", { name: /Interview patterns/ })).toContainText(/1\/\d+/);
  });

  test("the difficulty filter narrows the list, and MongoDB has its own topics", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    await page.getByRole("button", { name: "Hard", exact: true }).click();
    await expect(page.getByText(/challenges? match/)).toBeVisible();
    await page.getByLabel("Search challenges").fill("zzzz-nothing");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    await page.getByLabel("Search challenges").fill("");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByRole("button", { name: "MongoDB", exact: true }).click();
    await expect(page.getByRole("button", { name: /Joins with \$lookup/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Window functions/ })).toHaveCount(0);
  });
});
