import { expect, type Page } from "@playwright/test";

export const E2E = { email: "e2e@example.com", password: "e2e-password-123456", cronSecret: "e2e-cron-secret-1234567890", webhookSecret: "e2e-webhook-secret-1234567890" };

/** Signs in through the real form and waits for the dashboard. */
export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E.email);
  await page.getByLabel("Password").fill(E2E.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
}
