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

test.describe("DB Lab workspace", () => {
  test("query tabs can be added, renamed, switched with Alt+number and closed", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    const tablist = page.getByRole("tablist", { name: "Query tabs" });
    await expect(tablist.getByRole("tab", { name: "Query 1" })).toBeVisible();
    await type(page, "SELECT 1 AS first_tab");
    await page.getByRole("button", { name: "New query tab" }).click();
    await expect(tablist.getByRole("tab", { name: "Query 2" })).toBeVisible();
    await type(page, "SELECT 2 AS second_tab");
    await page.keyboard.press("Alt+1");
    await expect(page.locator(".cm-content").first()).toContainText("first_tab");
    await tablist.getByRole("tab", { name: "Query 2" }).dblclick();
    await page.getByLabel("Rename Query 2").fill("Totals");
    await page.keyboard.press("Enter");
    await expect(tablist.getByRole("tab", { name: "Totals" })).toBeVisible();
    // Tabs survive a reload (they are saved after a short debounce).
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByRole("tablist", { name: "Query tabs" }).getByRole("tab", { name: "Totals" })).toBeVisible();
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Close Totals" }).click();
    await expect(page.getByRole("tab", { name: "Totals" })).toHaveCount(0);
  });

  test("a saved query appears in the Saved list and is still there after a reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    await type(page, "SELECT name FROM employees WHERE salary > 100000");
    page.once("dialog", (d) => void d.accept("High earners e2e"));
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText('Saved "High earners e2e"')).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: /^Saved/ }).click();
    await expect(page.getByRole("button", { name: /^High earners e2e/ })).toBeVisible();
  });

  test("results can be sorted, filtered and exported, and the plan and ER views render", async ({ page }) => {
    await signIn(page);
    await page.goto("/playground/db");
    await type(page, "SELECT name, salary FROM employees ORDER BY id");
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByRole("region", { name: "Result 1" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("columnheader", { name: /salary/ }).getByRole("button").click();
    await page.getByPlaceholder("Filter rows").fill("alice");
    await expect(page.getByText(/1 of \d+ rows match/)).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export Result 1 as CSV/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);

    await page.getByRole("tab", { name: /Plan/ }).click();
    await expect(page.getByText(/SQLite plan:/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Query plan")).toContainText(/SCAN|SEARCH/);

    await page.getByRole("tab", { name: /Tables/ }).click();
    await page.getByRole("button", { name: "ER diagram" }).click();
    await expect(page.getByRole("img", { name: /Entity-relationship diagram/ })).toBeVisible({ timeout: 30_000 });
  });

  test("Postgres mode names its engine and runs a query", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.goto("/playground/db");
    await page.getByRole("button", { name: "Postgres", exact: true }).click();
    await expect(page.getByText(/Runs on/)).toContainText("PostgreSQL (PGlite)");
    await type(page, "SELECT version() AS v");
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByRole("region", { name: "Result 1" })).toContainText("PostgreSQL", { timeout: 90_000 });
  });
});

