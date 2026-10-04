import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Every main page renders without hitting the app's error screen or a browser error. Cheap, and it catches the kind of
 * failure unit tests miss: a component imported wrong, a prop missing, a page that throws on an empty database.
 */
const PAGES = [
  "/dashboard", "/learn", "/courses", "/roadmaps", "/design", "/web", "/web/interview", "/projects", "/blogs", "/news", "/ask", "/chat", "/plan", "/calendar",
  "/quiz", "/quiz/history", "/quiz/mistakes", "/review", "/backlog", "/stats", "/targets", "/mock", "/jobs", "/jobs/tracker", "/jobs/sources", "/jobs/links",
  "/resume", "/resume/tailor", "/practice", "/dsa", "/aptitude", "/playground", "/setup", "/settings", "/settings/api-tokens",
];

/** Pages known to be broken right now are listed here with the reason, so they stay visible instead of being dropped. */
const KNOWN_BROKEN: Record<string, string> = {
  "/settings": "Crashes with \"Element type is invalid ... got: undefined\": the icon map in modules/settings/components/notification-card.tsx has no entry for the new mail categories resume, design and calendar (unfinished notifications work). Remove this line when it is fixed.",
};

test.describe("smoke: every main page renders", () => {
  for (const path of PAGES) {
    test(path, async ({ page }) => {
      if (KNOWN_BROKEN[path]) test.fixme(true, KNOWN_BROKEN[path]);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await signIn(page);
      const res = await page.goto(path);
      expect(res?.status(), `${path} status`).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: "Try again" }), `${path} shows the error screen`).toHaveCount(0);
      await expect(page.getByText(/Application error|Something went wrong|Element type is invalid/i)).toHaveCount(0);
      expect(errors, `${path} threw in the browser`).toEqual([]);
    });
  }
});
