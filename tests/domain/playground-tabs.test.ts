import { describe, expect, it } from "vitest";
import {
  MAX_TABS, closeTab, createTab, focusNth, isDirty, migrateLegacyScratch, moveTab, nameProblem, nameFromTitle, openSnippetTab, openTab,
  parseTabs, renameTab, serializeTabs, stepTab, uniqueName, updateTab, type TabsState,
} from "@/modules/dsa/domain/playground-tabs";

const one = (): TabsState => {
  const t = createTab({ language: "javascript", code: "a", id: "a" }, []);
  return { tabs: [t], activeId: t.id };
};
const fresh = () => createTab({ language: "javascript", code: "", id: "fresh" }, []);

describe("playground tabs", () => {
  it("makes names unique", () => {
    expect(uniqueName("main.js", [])).toBe("main.js");
    expect(uniqueName("main.js", ["Main.js"])).toBe("main-2.js");
    expect(uniqueName("main.js", ["main.js", "main-2.js"])).toBe("main-3.js");
  });

  it("opens tabs up to the limit and focuses the new one", () => {
    let s = one();
    for (let i = 1; i < MAX_TABS; i++) s = openTab(s, createTab({ language: "python", code: "", id: `p${i}` }, s.tabs));
    expect(s.tabs).toHaveLength(MAX_TABS);
    expect(s.activeId).toBe(`p${MAX_TABS - 1}`);
    expect(new Set(s.tabs.map((t) => t.name)).size).toBe(MAX_TABS);
    expect(openTab(s, createTab({ language: "python", code: "" }, s.tabs))).toBe(s);
  });

  it("closes a tab and picks a neighbour, or a fresh tab for the last one", () => {
    let s = one();
    s = openTab(s, createTab({ language: "javascript", code: "b", id: "b" }, s.tabs));
    s = openTab(s, createTab({ language: "javascript", code: "c", id: "c" }, s.tabs));
    s = closeTab(s, "c", fresh);
    expect(s.activeId).toBe("b");
    s = closeTab(s, "a", fresh);
    expect(s.tabs.map((t) => t.id)).toEqual(["b"]);
    s = closeTab(s, "b", fresh);
    expect(s.tabs.map((t) => t.id)).toEqual(["fresh"]);
    expect(s.activeId).toBe("fresh");
  });

  it("validates and applies renames", () => {
    let s = openTab(one(), createTab({ language: "python", code: "", id: "b", name: "helper.py" }, one().tabs));
    expect(nameProblem("", "a", s.tabs)).toMatch(/name/);
    expect(nameProblem("HELPER.py", "a", s.tabs)).toMatch(/already/);
    expect(nameProblem("a/b.js", "a", s.tabs)).toMatch(/slashes/);
    expect(renameTab(s, "a", "helper.py")).toBe(s);
    s = renameTab(s, "a", " util.js ");
    expect(s.tabs[0]!.name).toBe("util.js");
  });

  it("reorders and steps focus with wrap-around", () => {
    let s = one();
    s = openTab(s, createTab({ language: "javascript", code: "", id: "b" }, s.tabs));
    s = openTab(s, createTab({ language: "javascript", code: "", id: "c" }, s.tabs));
    expect(moveTab(s, "c", 0).tabs.map((t) => t.id)).toEqual(["c", "a", "b"]);
    expect(moveTab(s, "a", 99).tabs.map((t) => t.id)).toEqual(["b", "c", "a"]);
    expect(stepTab(s, 1).activeId).toBe("a");
    expect(stepTab({ ...s, activeId: "a" }, -1).activeId).toBe("c");
    expect(focusNth(s, 2).activeId).toBe("b");
    expect(focusNth(s, 9)).toBe(s);
  });

  it("tracks unsaved changes", () => {
    const s = updateTab(one(), "a", { code: "changed" });
    expect(isDirty(s.tabs[0]!)).toBe(true);
    expect(isDirty(updateTab(s, "a", { baseline: "changed" }).tabs[0]!)).toBe(false);
  });

  it("opens a snippet once and refocuses its tab", () => {
    const snip = { id: "s1", title: "Debounce Fn", tag: "js", code: "x", language: "javascript" as const };
    const s = openSnippetTab(one(), snip)!;
    expect(s.tabs).toHaveLength(2);
    expect(s.tabs[1]!.name).toBe("debounce_fn.js");
    const back = openSnippetTab({ ...s, activeId: "a" }, snip)!;
    expect(back.tabs).toHaveLength(2);
    expect(back.activeId).toBe(s.tabs[1]!.id);
    let full = one();
    for (let i = 1; i < MAX_TABS; i++) full = openTab(full, createTab({ language: "python", code: "" }, full.tabs));
    expect(openSnippetTab(full, snip)).toBeNull();
    expect(nameFromTitle("???")).toBe("snippet");
  });

  it("round-trips through storage and rejects junk", () => {
    const s = openSnippetTab(one(), { id: "s1", title: "T", tag: "t", code: "x", language: "python" })!;
    expect(parseTabs(serializeTabs(s))).toEqual(s);
    expect(parseTabs("nope")).toBeNull();
    expect(parseTabs(JSON.stringify({ tabs: [{ id: 1 }] }))).toBeNull();
    const dup = JSON.stringify({ activeId: "zzz", tabs: [{ id: "a", name: "m.js", language: "javascript", code: "1" }, { id: "b", name: "m.js", language: "python", code: "2" }] });
    const p = parseTabs(dup)!;
    expect(p.activeId).toBe("a");
    expect(p.tabs.map((t) => t.name)).toEqual(["m.js", "m-2.js"]);
  });

  it("migrates the legacy scratch value", () => {
    const m = migrateLegacyScratch(JSON.stringify({ code: "print(1)", language: "python" }))!;
    expect(m.tabs).toHaveLength(1);
    expect(m.tabs[0]).toMatchObject({ name: "main.py", code: "print(1)", language: "python" });
    expect(migrateLegacyScratch(null)).toBeNull();
    expect(migrateLegacyScratch('{"code":1}')).toBeNull();
  });
});
