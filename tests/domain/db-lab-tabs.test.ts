import { describe, expect, it } from "vitest";
import { MAX_TABS, addTab, openTab, closeTab, initialTabs, parseTabs, renameTab, updateTab } from "@/modules/dsa/domain/db-lab-tabs";
import { localOnlySolved, mergeSolved } from "@/modules/dsa/domain/db-lab-progress";

describe("query tabs", () => {
  it("starts with one tab and adds named tabs up to the limit", () => {
    let s = initialTabs("SELECT 1", "company", "a");
    expect(s.tabs.map((t) => t.name)).toEqual(["Query 1"]);
    for (let i = 0; i < 10; i++) s = addTab(s, "", "company", `id${i}`);
    expect(s.tabs).toHaveLength(MAX_TABS);
    expect(new Set(s.tabs.map((t) => t.name)).size).toBe(MAX_TABS);
    expect(s.active).toBe(`id${MAX_TABS - 2}`);
  });
  it("reuses a freed name and activates a neighbour when the active tab closes", () => {
    let s = initialTabs("", "d", "a");
    s = addTab(s, "", "d", "b");
    s = addTab(s, "", "d", "c");
    s = closeTab(s, "c", "", "d");
    expect(s.active).toBe("b");
    s = addTab(s, "", "d", "e");
    expect(s.tabs.at(-1)!.name).toBe("Query 3");
  });
  it("closing the last tab leaves a fresh one", () => {
    const s = closeTab(initialTabs("x", "d", "a"), "a", "-- new", "d", "z");
    expect(s.tabs).toEqual([{ id: "z", name: "Query 1", code: "-- new", dataset: "d" }]);
    expect(s.active).toBe("z");
  });
  it("renames (trimmed, capped, never blank) and updates code", () => {
    let s = initialTabs("", "d", "a");
    expect(renameTab(s, "a", "   ").tabs[0]!.name).toBe("Query 1");
    s = renameTab(s, "a", "  Top   earners ".repeat(5));
    expect(s.tabs[0]!.name.length).toBeLessThanOrEqual(24);
    expect(updateTab(s, "a", { code: "SELECT 2" }).tabs[0]!.code).toBe("SELECT 2");
  });
  it("opens a tab beside the others, or replaces the active one when full", () => {
    let s = initialTabs("", "d", "a");
    s = openTab(s, { id: "n", name: "Saved", code: "q", dataset: "d" });
    expect(s.tabs.map((t) => t.id)).toEqual(["a", "n"]);
    expect(s.active).toBe("n");
    for (let i = 0; i < 4; i++) s = addTab(s, "", "d", `x${i}`);
    const full = openTab(s, { id: "m", name: "Other", code: "z", dataset: "d" });
    expect(full.tabs).toHaveLength(MAX_TABS);
    expect(full.tabs.find((t) => t.id === full.active)).toMatchObject({ name: "Other", code: "z" });
  });
  it("parses stored tabs defensively", () => {
    expect(parseTabs(null)).toBeNull();
    expect(parseTabs("{oops")).toBeNull();
    expect(parseTabs('{"tabs":[],"active":"x"}')).toBeNull();
    const ok = parseTabs(JSON.stringify({ tabs: [{ id: "a", name: "n", code: "c", dataset: "d" }, { id: "a", name: "dup", code: "", dataset: "" }, { id: 3 }], active: "missing" }));
    expect(ok).toEqual({ tabs: [{ id: "a", name: "n", code: "c", dataset: "d" }], active: "a" });
    const many = parseTabs(JSON.stringify({ tabs: Array.from({ length: 9 }, (_, i) => ({ id: `i${i}`, name: "n", code: "", dataset: "" })), active: "i1" }));
    expect(many!.tabs).toHaveLength(MAX_TABS);
    expect(many!.active).toBe("i1");
  });
});

describe("solved progress merge", () => {
  it("unions server and device ids", () => {
    expect([...mergeSolved([{ challengeId: "a" }], ["b", "a"])].toSorted()).toEqual(["a", "b"]);
  });
  it("finds the ids only this device knows, skipping unknown challenges", () => {
    const modeOf = (id: string) => (id === "ghost" ? null : id.startsWith("m") ? ("mongo" as const) : ("sql" as const));
    expect(localOnlySolved([{ challengeId: "a" }], ["a", "b", "m1", "ghost", "b"], modeOf)).toEqual([
      { challengeId: "b", mode: "sql" },
      { challengeId: "m1", mode: "mongo" },
    ]);
  });
});
