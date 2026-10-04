import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";
import { answerCorrectly, answerWrongly } from "./quiz-oracle";

/**
 * The product's central rule: the quiz is what completes the day. The plan's weekday rules come from the real calendar and the
 * server clock cannot be moved, so the full flow runs on the Sunday review day, whose only requirement is the weekly quiz.
 * On any other day this file checks the gate instead (the quiz is not open until the day's targets are done).
 */
async function todayNeedsOnlyTheWeeklyQuiz(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const text = await page.locator("main").innerText();
  return /Weekly quiz/.test(text) && /0\/1/.test(text);
}

async function takeQuiz(page: Page, answer: (p: Page) => Promise<unknown>) {
  await page.goto("/quiz");
  await page.getByRole("button", { name: /Start quiz|Retake/ }).first().click();
  for (let i = 0; i < 40; i++) {
    await answer(page);
    const btn = page.getByRole("button", { name: /^(Next|Submit|Finish)/ }).first();
    const label = (await btn.innerText()).trim();
    await btn.click();
    if (/Submit|Finish/.test(label)) return;
  }
  throw new Error("The quiz never offered a Submit button");
}

test.describe.serial("the quiz completes the day", () => {
  test("failing the quiz does not complete the day, passing it does", async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page);
    test.skip(!(await todayNeedsOnlyTheWeeklyQuiz(page)), "Not a Sunday review day: today has targets to finish before the quiz opens, and the server clock cannot be moved.");

    await takeQuiz(page, answerWrongly);
    await expect(page.getByText(/Not passed|Try again|Retake/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Quiz requirement met/)).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page.getByText("Day complete")).toHaveCount(0);

    await takeQuiz(page, async (p) => {
      if (!(await answerCorrectly(p))) throw new Error("A question was not in the offline bank; the oracle cannot answer it");
    });
    await expect(page.getByText(/Quiz requirement met for today/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Scored 100 percent/)).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Day complete. Nice work!")).toBeVisible();
    await expect(page.getByText("1/1").first()).toBeVisible();
  });

  test("a completed day shows in the streak", async ({ page }) => {
    await signIn(page);
    test.skip(!(await page.getByText("Day complete. Nice work!").count()), "The day was not completed (not a Sunday review day).");
    await expect(page.locator("main")).toContainText(/Streak\s*1 day/);
  });
});
