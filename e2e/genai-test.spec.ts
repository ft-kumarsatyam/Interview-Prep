import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("GenAI tests: take a weekly test, submit, self-grade and see the result", async ({ page }) => {
  await signIn(page);
  await page.goto("/genai-test");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Start this week's test" }).click();
  await page.waitForURL(/\/genai-test\/[a-f0-9]{24}/);
  await expect(page.getByText("The answer key stays hidden until you submit.")).toBeVisible();
  for (const group of await page.getByRole("radiogroup").all()) await group.getByRole("radio").first().check();
  for (const box of await page.getByRole("textbox").all()) await box.fill("Define it, explain the mechanism, then the trade-off and a failure mode.");
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.getByText("Pass mark").first()).toBeVisible();
  await expect(page.getByText("A strong answer covers").first()).toBeVisible();
  const grades = page.getByRole("button", { name: "Save grade" });
  if (await grades.count()) {
    const forms = page.getByText("Grade yourself against the model answer").first();
    await expect(forms).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText("Pass mark").first()).toBeVisible();
});
