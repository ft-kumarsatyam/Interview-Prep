import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const REF = encodeURIComponent("js-basics:1");

/** Answers every question with its first option and submits. Returns after the result is on screen. */
async function runQuiz(page: Page) {
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Question ${i + 1} of 5`)).toBeVisible();
    // Single-choice questions are radios, multi-select ones are checkboxes: pick the first of whichever this is.
    await page.getByRole("radio").or(page.getByRole("checkbox")).first().click();
    await page.getByRole("button", { name: /^(Next|Submit|Finish)/ }).click();
  }
}

test.describe("quiz levels", () => {
  test("a practice run is tracked on the easy / medium / hard ladder", async ({ page }) => {
    await signIn(page);
    await page.goto(`/learn/practice?ref=${REF}`);
    const ladder = page.getByRole("radiogroup", { name: "Level" });
    await expect(ladder).toBeVisible();
    await expect(ladder.getByRole("radio", { name: /Easy/ })).toContainText("Next");
    await expect(ladder.getByRole("radio", { name: /Hard/ })).toContainText("questions");

    await ladder.getByRole("radio", { name: /Easy/ }).click();
    await page.getByRole("button", { name: /Start practice/ }).click();
    await runQuiz(page);
    // The result screen: a score, and a way to go again.
    await expect(page.getByText(/\d+%/).first()).toBeVisible({ timeout: 20_000 });

    // The run is remembered: the ladder now shows one easy run, and nothing at the other levels.
    await page.goto(`/learn/practice?ref=${REF}`);
    await expect(page.getByRole("radiogroup", { name: "Level" }).getByRole("radio", { name: /Easy/ })).toContainText("1 run");
    await expect(page.getByRole("radiogroup", { name: "Level" }).getByRole("radio", { name: /Medium/ })).toContainText("Clear it with");
  });

  test("asking for AI questions with no AI key set explains why instead of failing silently", async ({ page }) => {
    await signIn(page);
    await page.goto(`/learn/practice?ref=${REF}`);
    await page.getByRole("radio", { name: /Medium/ }).click();
    await page.getByRole("button", { name: /Add 5 new medium questions with AI/ }).click();
    await expect(page.getByText(/provider|key|configured/i).first()).toBeVisible();
  });
});
