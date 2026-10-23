/** Query tabs of the DB Lab free-query editor: at most six named tabs, stored on the device. Pure. */

export const MAX_TABS = 6;
export const MAX_TAB_NAME = 24;

export interface QueryTab {
  id: string;
  name: string;
  code: string;
  dataset: string;
}

export interface TabsState {
  tabs: QueryTab[];
  active: string;
}

let counter = 0;
export const newTabId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

/** The first name "Query N" not already used. */
export function nextTabName(tabs: readonly QueryTab[]): string {
  const used = new Set(tabs.map((t) => t.name));
  for (let n = 1; n <= MAX_TABS + 1; n++) if (!used.has(`Query ${n}`)) return `Query ${n}`;
  return `Query ${tabs.length + 1}`;
}

export function initialTabs(code: string, dataset: string, id = newTabId()): TabsState {
  return { tabs: [{ id, name: "Query 1", code, dataset }], active: id };
}

export function addTab(state: TabsState, code: string, dataset: string, id = newTabId()): TabsState {
  if (state.tabs.length >= MAX_TABS) return state;
  return { tabs: [...state.tabs, { id, name: nextTabName(state.tabs), code, dataset }], active: id };
}

/** Closing the last tab leaves a fresh empty one, so there is always a tab to type in. */
export function closeTab(state: TabsState, id: string, starter: string, dataset: string, freshId = newTabId()): TabsState {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  if (tabs.length === 0) return initialTabs(starter, dataset, freshId);
  const active = state.active === id ? tabs[Math.min(idx, tabs.length - 1)]!.id : state.active;
  return { tabs, active };
}

/** Opens `tab` as the active tab; when all six are in use it replaces the active tab's contents instead. */
export function openTab(state: TabsState, tab: QueryTab): TabsState {
  if (state.tabs.length < MAX_TABS) return { tabs: [...state.tabs, tab], active: tab.id };
  return { tabs: state.tabs.map((t) => (t.id === state.active ? { ...tab, id: t.id } : t)), active: state.active };
}

export function renameTab(state: TabsState, id: string, name: string): TabsState {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, MAX_TAB_NAME);
  if (!clean) return state;
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, name: clean } : t)) };
}

export function updateTab(state: TabsState, id: string, patch: Partial<Pick<QueryTab, "code" | "dataset">>): TabsState {
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

/** Parses what was stored; anything malformed yields null so the caller starts fresh. Tabs beyond the limit are dropped. */
export function parseTabs(raw: string | null): TabsState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const { tabs, active } = v as { tabs?: unknown; active?: unknown };
    if (!Array.isArray(tabs)) return null;
    const clean: QueryTab[] = [];
    for (const t of tabs) {
      if (!t || typeof t !== "object") continue;
      const { id, name, code, dataset } = t as Record<string, unknown>;
      if (typeof id !== "string" || typeof name !== "string" || typeof code !== "string" || typeof dataset !== "string") continue;
      if (clean.some((c) => c.id === id)) continue;
      clean.push({ id, name: name.slice(0, MAX_TAB_NAME) || "Query", code: code.slice(0, 20_000), dataset });
      if (clean.length === MAX_TABS) break;
    }
    if (clean.length === 0) return null;
    return { tabs: clean, active: typeof active === "string" && clean.some((t) => t.id === active) ? active : clean[0]!.id };
  } catch {
    return null;
  }
}
