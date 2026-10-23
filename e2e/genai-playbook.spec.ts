import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("GenAI playbook: toggle a task, save a readiness review, open the roadmap", async ({ page }) => {
  await signIn(page);
  await page.goto("/genai-playbook/today");
  await page.waitForLoadState("networkidle");
  const box = page.getByRole("checkbox").first();
  const before = await box.getAttribute("aria-checked");
  const next = before === "true" ? "false" : "true";
  const posted = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await box.click();
  await posted;
  await expect(box).toHaveAttribute("aria-checked", next);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", next);

  await page.goto("/genai-playbook/reviews");
  await page.waitForLoadState("networkidle");
  for (const group of await page.getByRole("radiogroup").all()) await group.getByRole("radio").nth(3).click();
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Saved").first()).toBeVisible();

  await page.goto("/roadmaps/genai-interview-playbook");
  await expect(page.getByRole("heading", { name: /GenAI Interview Playbook/ }).first()).toBeVisible();
});
