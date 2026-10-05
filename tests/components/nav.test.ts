import { describe, expect, it } from "vitest";
import { MOBILE_HUB_IDS, MORE_HUB_IDS, NAV_HUBS, NAV_ITEMS, hubFor, isHubLanding, pageFor, parseOpenHubs, toggleHub } from "@/components/layout/nav-items";

describe("nav hubs", () => {
  it("has unique hrefs, so every page belongs to exactly one hub", () => {
    const hrefs = NAV_ITEMS.map((p) => p.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(NAV_HUBS.map((h) => h.id)).toEqual(["today", "plan", "practice", "learn", "career", "settings"]);
  });

  it("puts Planner, Calendar and Targets first in the Plan hub, and jobs with the resume under Career", () => {
    expect(NAV_HUBS.find((h) => h.id === "plan")!.pages.map((p) => p.label)).toEqual(["Planner", "Calendar", "Targets", "Stats"]);
    expect(hubFor("/jobs/tracker")?.id).toBe("career");
    expect(hubFor("/resume/tailor")?.id).toBe("career");
    expect(hubFor("/calendar/2026-10-04")?.id).toBe("plan");
  });

  it("opens each hub on one of its own pages", () => {
    for (const hub of NAV_HUBS) expect(hub.pages.some((p) => p.href === hub.href), hub.id).toBe(true);
  });

  it("keeps every old top-level route reachable", () => {
    const old = ["/dashboard", "/quiz", "/plan", "/review", "/calendar", "/dsa", "/problems", "/mock", "/playground", "/playground/db", "/aptitude", "/learn", "/design", "/news", "/stats", "/settings", "/setup"];
    for (const href of old) expect(pageFor(href), href).toBeDefined();
  });

  it("matches the longest prefix, so DB Lab is not mistaken for Playground", () => {
    expect(pageFor("/playground/db")?.label).toBe("DB Lab");
    expect(pageFor("/playground")?.label).toBe("Playground");
    expect(pageFor("/playground/db/anything")?.label).toBe("DB Lab");
    expect(pageFor("/web/interview/react")?.label).toBe("Web & AI");
    expect(pageFor("/web/react-rendering")?.label).toBe("Web & AI");
  });

  it("finds the hub for detail pages and ignores unknown routes", () => {
    expect(hubFor("/dsa/two-sum")?.id).toBe("practice");
    expect(hubFor("/learn/hld-framework")?.id).toBe("learn");
    expect(hubFor("/quiz/history/2026-10-03")?.id).toBe("today");
    expect(hubFor("/nope")).toBeUndefined();
  });

  it("shows tab strips only on landing pages", () => {
    expect(isHubLanding("/dsa")).toBe(true);
    expect(isHubLanding("/dsa/")).toBe(true);
    expect(isHubLanding("/dsa/two-sum")).toBe(false);
    expect(isHubLanding("/playground/db")).toBe(true);
  });

  it("reads stored expanded hubs defensively", () => {
    expect(parseOpenHubs(null)).toEqual([]);
    expect(parseOpenHubs("not json")).toEqual([]);
    expect(parseOpenHubs('{"learn":true}')).toEqual([]);
    expect(parseOpenHubs('["learn","nope",3,"learn","plan"]')).toEqual(["learn", "plan"]);
  });

  it("toggles a hub and keeps sidebar order", () => {
    expect(toggleHub([], "plan")).toEqual(["plan"]);
    expect(toggleHub(["plan"], "today")).toEqual(["today", "plan"]);
    expect(toggleHub(["today", "plan"], "plan")).toEqual(["today"]);
  });

  it("keeps the mobile bar to four hubs plus More", () => {
    expect(MOBILE_HUB_IDS).toEqual(["today", "plan", "practice", "learn"]);
    expect([...MOBILE_HUB_IDS, ...MORE_HUB_IDS].toSorted()).toEqual(NAV_HUBS.map((h) => h.id).toSorted());
  });
});
