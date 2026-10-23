/** Playground editor buffers (tabs). Pure: the component owns state, these helpers decide how it changes. */
import { isLanguage, type Language } from "@/modules/dsa/domain/starters";

export const MAX_TABS = 8;
export const MAX_NAME = 40;

export interface TabSnippet {
  id: string;
  title: string;
  tag: string;
}

export interface Tab {
  id: string;
  name: string;
  language: Language;
  code: string;
  stdin: string;
  snippet?: TabSnippet;
  /** The code as last saved or loaded; a tab is dirty when `code` differs. */
  baseline: string;
}

export interface TabsState {
  tabs: Tab[];
  activeId: string;
}

export const EXT: Record<Language, string> = { javascript: "js", typescript: "ts", python: "py" };

export function extFor(language: Language): string {
  return EXT[language];
}

export function makeTabId(): string {
  return `t${Math.random().toString(36).slice(2, 9)}`;
}

/** A name that is not in `taken` (case-insensitive): `main.js`, then `main-2.js`, `main-3.js`. */
export function uniqueName(base: string, taken: readonly string[]): string {
  const used = new Set(taken.map((n) => n.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

/** Turns a snippet title into a file name stem. */
export function nameFromTitle(title: string): string {
  const stem = title.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
  return stem || "snippet";
}

export function createTab(
  input: { language: Language; code: string; name?: string; stdin?: string; snippet?: TabSnippet; baseline?: string; id?: string },
  existing: readonly Tab[],
): Tab {
  const base = input.name?.trim() || `main.${extFor(input.language)}`;
  return {
    id: input.id ?? makeTabId(),
    name: uniqueName(base, existing.map((t) => t.name)),
    language: input.language,
    code: input.code,
    stdin: input.stdin ?? "",
    snippet: input.snippet,
    baseline: input.baseline ?? input.code,
  };
}

export function isDirty(tab: Tab): boolean {
  return tab.code !== tab.baseline;
}

export function activeTab(state: TabsState): Tab {
  return state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0]!;
}

export function canOpen(state: TabsState): boolean {
  return state.tabs.length < MAX_TABS;
}

/** Adds a tab and focuses it. Returns the state unchanged when the limit is reached. */
export function openTab(state: TabsState, tab: Tab): TabsState {
  if (!canOpen(state)) return state;
  return { tabs: [...state.tabs, tab], activeId: tab.id };
}

export function focusTab(state: TabsState, id: string): TabsState {
  return state.tabs.some((t) => t.id === id) ? { ...state, activeId: id } : state;
}

/** Moves focus by `step` tabs, wrapping around. */
export function stepTab(state: TabsState, step: 1 | -1): TabsState {
  const i = state.tabs.findIndex((t) => t.id === state.activeId);
  const next = state.tabs[(i + step + state.tabs.length) % state.tabs.length];
  return next ? { ...state, activeId: next.id } : state;
}

/** Focuses the nth tab (1-based). */
export function focusNth(state: TabsState, n: number): TabsState {
  const t = state.tabs[n - 1];
  return t ? { ...state, activeId: t.id } : state;
}

/** Closes a tab. The last tab is replaced by a fresh empty one so there is always something to edit. */
export function closeTab(state: TabsState, id: string, fresh: () => Tab): TabsState {
  const i = state.tabs.findIndex((t) => t.id === id);
  if (i < 0) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  if (tabs.length === 0) {
    const tab = fresh();
    return { tabs: [tab], activeId: tab.id };
  }
  const activeId = state.activeId === id ? tabs[Math.min(i, tabs.length - 1)]!.id : state.activeId;
  return { tabs, activeId };
}

export function updateTab(state: TabsState, id: string, patch: Partial<Omit<Tab, "id">>): TabsState {
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

/** Why a name is not allowed, or null. Names must be unique (case-insensitive) and have no path separators. */
export function nameProblem(name: string, id: string, tabs: readonly Tab[]): string | null {
  const n = name.trim();
  if (!n) return "Give the file a name.";
  if (n.length > MAX_NAME) return `Keep the name under ${MAX_NAME} characters.`;
  if (/[\\/:*?"<>|]/.test(n)) return "A name cannot contain slashes or special characters.";
  if (tabs.some((t) => t.id !== id && t.name.toLowerCase() === n.toLowerCase())) return "Another tab already has that name.";
  return null;
}

export function renameTab(state: TabsState, id: string, name: string): TabsState {
  if (nameProblem(name, id, state.tabs)) return state;
  return updateTab(state, id, { name: name.trim() });
}

/** Moves a tab to index `to`. */
export function moveTab(state: TabsState, id: string, to: number): TabsState {
  const from = state.tabs.findIndex((t) => t.id === id);
  if (from < 0) return state;
  const target = Math.max(0, Math.min(state.tabs.length - 1, to));
  if (from === target) return state;
  const tabs = [...state.tabs];
  const [moved] = tabs.splice(from, 1);
  tabs.splice(target, 0, moved!);
  return { ...state, tabs };
}

/** The tab already showing this saved snippet, if any. */
export function tabForSnippet(state: TabsState, snippetId: string): Tab | undefined {
  return state.tabs.find((t) => t.snippet?.id === snippetId);
}

/** Opens a snippet in a new tab, or focuses the tab that already has it. Null when full and not open. */
export function openSnippetTab(
  state: TabsState,
  s: { id: string; title: string; tag: string; code: string; language: Language },
): TabsState | null {
  const existing = tabForSnippet(state, s.id);
  if (existing) return focusTab(state, existing.id);
  if (!canOpen(state)) return null;
  const tab = createTab(
    { language: s.language, code: s.code, name: `${nameFromTitle(s.title)}.${extFor(s.language)}`, snippet: { id: s.id, title: s.title, tag: s.tag } },
    state.tabs,
  );
  return openTab(state, tab);
}

// --- persistence ---

export const TABS_VERSION = 1;

interface Stored {
  v: number;
  activeId: string;
  tabs: Array<Omit<Tab, "snippet"> & { snippet?: TabSnippet }>;
}

export function serializeTabs(state: TabsState): string {
  const stored: Stored = { v: TABS_VERSION, activeId: state.activeId, tabs: state.tabs };
  return JSON.stringify(stored);
}

const str = (v: unknown): v is string => typeof v === "string";

function parseTab(raw: unknown): Tab | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!str(r.id) || !str(r.name) || !str(r.code) || !isLanguage(r.language)) return null;
  let snippet: TabSnippet | undefined;
  if (r.snippet && typeof r.snippet === "object") {
    const s = r.snippet as Record<string, unknown>;
    if (str(s.id) && str(s.title)) snippet = { id: s.id, title: s.title, tag: str(s.tag) ? s.tag : "" };
  }
  return {
    id: r.id,
    name: r.name.slice(0, MAX_NAME),
    language: r.language,
    code: r.code,
    stdin: str(r.stdin) ? r.stdin : "",
    snippet,
    baseline: str(r.baseline) ? r.baseline : r.code,
  };
}

/** Reads the saved tabs. Null when missing or unusable. */
export function parseTabs(raw: string | null): TabsState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { tabs?: unknown; activeId?: unknown } | null;
    if (!v || !Array.isArray(v.tabs)) return null;
    const seen = new Set<string>();
    const tabs: Tab[] = [];
    for (const item of v.tabs.slice(0, MAX_TABS)) {
      const t = parseTab(item);
      if (!t || seen.has(t.id)) continue;
      seen.add(t.id);
      tabs.push({ ...t, name: uniqueName(t.name, tabs.map((x) => x.name)) });
    }
    if (tabs.length === 0) return null;
    return { tabs, activeId: str(v.activeId) && seen.has(v.activeId) ? v.activeId : tabs[0]!.id };
  } catch {
    return null;
  }
}

/** The old single-buffer `playground:scratch` value as a first tab. Null when missing or unusable. */
export function migrateLegacyScratch(raw: string | null): TabsState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { code?: unknown; language?: unknown } | null;
    if (!v || !str(v.code) || !isLanguage(v.language)) return null;
    const tab = createTab({ language: v.language, code: v.code }, []);
    return { tabs: [tab], activeId: tab.id };
  } catch {
    return null;
  }
}
