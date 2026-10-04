import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BacklogPull } from "@/lib/models/backlog";
import { Settings } from "@/lib/models/system";
import {
  dismissBacklogItem,
  ensureBacklogQueue,
  getBacklog,
  getBacklogMail,
  loadBacklogItems,
  loadBacklogMail,
  pullBacklogItem,
  restoreAllDismissed,
  restoreBacklogItem,
  snoozeBacklogItem,
  unpullBacklogItem,
} from "@/lib/services/backlog";
import { ensureToday } from "@/lib/services/plan";
import { invalidateSettings, setBacklogBudget } from "@/lib/services/settings";
import { addTarget, getTargetDetail, getTargetsOverview, listTargets, loadCompanyGaps, removeTarget, setPinned, updateTarget, MAX_TARGETS } from "@/lib/services/targets";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const DAY = at("2026-10-20");
const ctx = async (now = DAY) => {
  const s = await ensureToday(now);
  return { today: s.today, plan: s.plan, settings: s.settings };
};

describe("backlog items and your decisions", () => {
  it("derives owed work from real progress: DSA behind pace and theory from finished weeks", async () => {
    const c = await ctx();
    const items = await loadBacklogItems(c);
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds.has("dsa")).toBe(true);
    expect(kinds.has("theory")).toBe(true);
    expect(kinds.has("company")).toBe(false);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    expect(items.every((i) => i.path.startsWith("/"))).toBe(true);
  });

  it("snooze hides an item until its day, restore brings it back, dismiss hides it for good", async () => {
    const c = await ctx();
    const first = (await getBacklog(c)).open[0]!;
    await snoozeBacklogItem(first.key, 3, c.today);
    let view = await getBacklog(c);
    expect(view.open.map((i) => i.key)).not.toContain(first.key);
    expect(view.snoozed.map((i) => i.key)).toContain(first.key);

    const later = await ctx(at("2026-10-24"));
    expect((await getBacklog(later)).open.map((i) => i.key)).toContain(first.key);

    await restoreBacklogItem(first.key);
    expect((await getBacklog(c)).open.map((i) => i.key)).toContain(first.key);

    await dismissBacklogItem(first.key);
    view = await getBacklog(c);
    expect(view.open.map((i) => i.key)).not.toContain(first.key);
    expect(view.dismissedCount).toBe(1);
    expect(await restoreAllDismissed()).toBe(1);
    expect((await getBacklog(c)).dismissedCount).toBe(0);
  });
});

describe("the daily queue", () => {
  it("queues exactly the budget, once, even when called again", async () => {
    const c = await ctx();
    expect(c.settings.backlogBudget).toBe(2);
    const first = await ensureBacklogQueue(c);
    expect(first.queue).toHaveLength(2);
    const again = await ensureBacklogQueue(c);
    expect(again.queue.map((i) => i.key)).toEqual(first.queue.map((i) => i.key));
    expect(await BacklogPull.countDocuments({ date: c.today })).toBe(2);
  });

  it("mixes kinds rather than queueing two of the same", async () => {
    const c = await ctx();
    const q = (await ensureBacklogQueue(c)).queue;
    expect(new Set(q.map((i) => i.kind)).size).toBe(2);
  });

  it("a zero budget queues nothing, and a bigger budget queues more", async () => {
    await setBacklogBudget(0);
    expect((await ensureBacklogQueue(await ctx())).queue).toHaveLength(0);
    await resetDb();
    await Settings.create({ _id: "settings", backlogBudget: 5 });
    invalidateSettings();
    expect((await ensureBacklogQueue(await ctx())).queue).toHaveLength(5);
  });

  it("queues nothing on a rest day", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { restDays: ["2026-10-20"] } });
    invalidateSettings();
    expect((await ensureBacklogQueue(await ctx())).queue).toHaveLength(0);
  });

  it("a manual pull goes beyond the budget and can be taken back; a dismissed item leaves the queue", async () => {
    const c = await ctx();
    const view = await ensureBacklogQueue(c);
    const extra = view.open.find((i) => !view.queue.some((q) => q.key === i.key))!;
    await pullBacklogItem(extra.key, c.today);
    expect((await getBacklog(c)).queue).toHaveLength(3);
    await unpullBacklogItem(extra.key, c.today);
    expect((await getBacklog(c)).queue).toHaveLength(2);
    await dismissBacklogItem(view.queue[0]!.key);
    expect((await getBacklog(c)).queue.map((i) => i.key)).not.toContain(view.queue[0]!.key);
  });

  it("the mail shape lists groups and the queue; the read-only variant never queues", async () => {
    const c = await ctx();
    const quiet = await getBacklogMail(c);
    expect(quiet.queue).toHaveLength(0);
    expect(await BacklogPull.countDocuments({})).toBe(0);
    const mail = await loadBacklogMail(c);
    expect(mail.queue).toHaveLength(2);
    expect(mail.budget).toBe(2);
    expect(mail.groups.reduce((n, g) => n + g.total, 0)).toBe(mail.total);
    expect(mail.groups.every((g) => g.items.length <= g.total)).toBe(true);
  });
});

describe("targets", () => {
  it("adds from the catalogue with its tier, or a custom company with a tier, and refuses bad input", async () => {
    const google = await addTarget({ companyId: "google", priority: "dream" });
    expect(google).toMatchObject({ name: "Google", tier: "big-tech", priority: "dream" });
    const custom = await addTarget({ name: "Acme Labs", tier: "startup" });
    expect(custom).toMatchObject({ companyId: null, tier: "startup", priority: "target" });
    await expect(addTarget({ companyId: "nope" })).rejects.toThrow("Unknown company");
    await expect(addTarget({ name: "No Tier" })).rejects.toThrow("kind of company");
    await expect(addTarget({ name: "  " , tier: "startup" })).rejects.toThrow("company name");
    await expect(addTarget({ name: "google", tier: "startup" })).rejects.toThrow("already a target");
    expect((await listTargets()).map((t) => t.name)).toEqual(["Google", "Acme Labs"]);
  });

  it("limits the number of targets", async () => {
    for (let i = 0; i < MAX_TARGETS; i++) await addTarget({ name: `Co ${i}`, tier: "startup" });
    await expect(addTarget({ name: "One too many", tier: "startup" })).rejects.toThrow(`Up to ${MAX_TARGETS}`);
  });

  it("gives readiness per target and a blueprint matching its tier", async () => {
    const t = await addTarget({ companyId: "swiggy" });
    const [o] = await getTargetsOverview();
    expect(o).toMatchObject({ id: t.id, tierName: "Mid-tier product company" });
    expect(o!.overall).toBeGreaterThanOrEqual(0);
    const detail = (await getTargetDetail(t.id))!;
    expect(detail.blueprint.problems).toHaveLength(detail.profile.dsa.size);
    expect(detail.gaps.length).toBeGreaterThan(0);
    expect(await getTargetDetail("not-an-id")).toBeNull();
  });

  it("changing the tier changes the set; pins add to it and unpin removes them", async () => {
    const t = await addTarget({ companyId: "swiggy" });
    await updateTarget(t.id, { tier: "big-tech", priority: "dream", interviewDate: "2026-12-01", notes: "Round 1 is DSA" });
    expect(await listTargets()).toMatchObject([{ tier: "big-tech", priority: "dream", interviewDate: "2026-12-01", notes: "Round 1 is DSA" }]);
    expect((await getTargetDetail(t.id))!.blueprint.problems).toHaveLength(150);

    await setPinned(t.id, "dsa", "two-sum", true);
    await setPinned(t.id, "dsa", "two-sum", true);
    await setPinned(t.id, "design", "stock-exchange", true);
    expect((await listTargets())[0]).toMatchObject({ pinnedDsa: ["two-sum"], pinnedDesign: ["stock-exchange"] });
    await expect(setPinned(t.id, "dsa", "not-a-problem", true)).rejects.toThrow("Unknown item");
    await setPinned(t.id, "dsa", "two-sum", false);
    expect((await listTargets())[0]!.pinnedDsa).toEqual([]);
    await removeTarget(t.id);
    expect(await listTargets()).toEqual([]);
  });

  it("feeds the backlog: gaps appear as company items, boosted by priority, once per problem", async () => {
    await addTarget({ companyId: "google", priority: "dream" });
    await addTarget({ companyId: "uber", priority: "safe" });
    const gaps = await loadCompanyGaps();
    expect(new Set(gaps.map((g) => g.key)).size).toBe(gaps.length);
    expect(gaps.some((g) => g.note.startsWith("Google"))).toBe(true);
    expect(gaps[0]!.boost).toBeGreaterThanOrEqual(12);

    const c = await ctx();
    const items = await loadBacklogItems(c);
    expect(items.some((i) => i.kind === "company")).toBe(true);
    const keys = new Set(items.map((i) => i.key));
    for (const i of items.filter((x) => x.kind === "company")) {
      const ref = i.key.replace(/^company:/, "");
      // A company gap is only listed on its own when the plain item isn't already owed.
      expect(keys.has(ref.startsWith("sub:") ? `theory:${ref.slice(4)}` : ref), i.key).toBe(false);
    }
  });
});
