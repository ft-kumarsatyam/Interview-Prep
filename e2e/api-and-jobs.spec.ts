import { expect, test } from "@playwright/test";
import { E2E, signIn } from "./helpers";

const JOB = { title: "Staff Backend Engineer", company: "Initech", url: "https://initech.example.com/jobs/42", jd: "We use Node.js, PostgreSQL and Kafka to build payment APIs." };

test.describe.serial("API tokens and jobs", () => {
  let token = "";

  test("a token created in Settings is shown once and works against the API", async ({ page, request }) => {
    await signIn(page);
    await page.goto("/settings/api-tokens");
    await page.getByLabel("Name").fill("e2e token");
    await page.getByRole("button", { name: "Create token" }).click();
    const code = page.locator("code").filter({ hasText: /^pk_[a-z0-9]{8}_[a-z0-9]{32}$/ });
    await expect(code).toBeVisible();
    token = (await code.innerText()).trim();

    const headers = { authorization: `Bearer ${token}`, "idempotency-key": "e2e-key-0001" };
    const first = await request.post("/api/v1/jobs", { headers, data: JOB });
    expect(first.status()).toBe(201);
    const replay = await request.post("/api/v1/jobs", { headers, data: JOB });
    expect(replay.status()).toBe(201);
    expect(replay.headers()["idempotent-replayed"]).toBe("true");
    expect(await replay.json()).toEqual(await first.json());

    // Dismissing the secret leaves only the prefix in the list.
    await page.getByRole("button", { name: /I've saved it/ }).click();
    await expect(page.getByText(token)).toHaveCount(0);
    await expect(page.getByText(`pk_${token.split("_")[1]}_…`)).toBeVisible();
  });

  test("the captured job shows once in the tracker, with the readiness card and recruiter email on its page", async ({ page }) => {
    await signIn(page);
    await page.goto("/jobs/tracker");
    await expect(page.getByText(JOB.title)).toHaveCount(1);
    await page.getByText(JOB.title).first().click();
    await expect(page.getByRole("heading", { name: "Your readiness" }).or(page.getByText("Your readiness"))).toBeVisible();
    await expect(page.getByText("Email the recruiter")).toBeVisible();
    await expect(page.getByText(/Save your resume first/)).toBeVisible();
  });

  test("a scope the token lacks is refused, and a revoked token stops working", async ({ page, request }) => {
    const denied = await request.post("/api/v1/postings", { headers: { authorization: `Bearer ${token}` }, data: { jobs: [] } });
    expect(denied.status()).toBe(403);
    await signIn(page);
    await page.goto("/settings/api-tokens");
    await page.getByRole("button", { name: /Revoke e2e token/ }).click();
    await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
    const after = await request.get("/api/v1/jobs", { headers: { authorization: `Bearer ${token}` } });
    expect(after.status()).toBe(401);
    expect((await after.json()).error.code).toBe("revoked_token");
  });

  test("jobs pushed through the webhook appear in Discover; LinkedIn listings are refused", async ({ page, request }) => {
    const res = await request.post("/api/webhooks/jobs", {
      headers: { authorization: `Bearer ${E2E.webhookSecret}` },
      data: { jobs: [{ title: "Platform Engineer", company: "Globex", url: "https://globex.example.com/careers/7", description: "Docker and Kubernetes on AWS" }, { title: "Platform Engineer", company: "Evil", url: "https://www.linkedin.com/jobs/view/9" }] },
    });
    expect(await res.json()).toEqual({ accepted: 1, added: 1, rejected: 1 });
    await signIn(page);
    await page.goto("/jobs");
    await expect(page.getByText("Platform Engineer").first()).toBeVisible();
    await expect(page.getByText("Globex").first()).toBeVisible();
    await expect(page.getByText("Evil")).toHaveCount(0);
  });
});
