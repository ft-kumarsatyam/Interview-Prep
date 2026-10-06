/**
 * Architecture guard. The rules are written down in docs/STRUCTURE.md; this test keeps them true.
 *
 *  1. The module dependency graph is frozen. A new module-to-module import fails until you add it to BASELINE on
 *     purpose (and explain it in the pull request), so the planner/progress/notifications knot cannot grow unseen.
 *  2. core/ may only reach into a module's pure `domain/` or `lib/`, apart from the listed exceptions. core/services/ is
 *     the composition layer (cron, nav, export, seed) and may call any module's services.
 *  3. Modules reach app/ only to call a route's Server Actions.
 *  4. Shared UI lives in components/{ui,shared,layout}; feature UI lives in modules/<feature>/components.
 *  5. Every module has the same three folders, and domain/ has no UI or I/O (ESLint enforces the imports).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p: string) => relative(ROOT, p).split("\\").join("/");
const read = (p: string) => readFileSync(p, "utf8");
const specifiers = (src: string): string[] => [...src.matchAll(/(?:from\s+|import\()\s*"([^"]+)"/g)].map((m) => m[1]!);

const MODULE_FILES = walk(join(ROOT, "modules")).map(rel);
const CORE_FILES = walk(join(ROOT, "core")).map(rel);
const MODULES = readdirSync(join(ROOT, "modules")).filter((n) => statSync(join(ROOT, "modules", n)).isDirectory());

/** Every module-to-module import that exists today ("importer > imported"). Adding one is a design decision. */
const BASELINE = new Set([
  "ai > settings", "aptitude > planner", "aptitude > quiz", "aptitude > settings", "course > learn", "design > ai", "design > news", "design > progress",
  "design > quiz", "dsa > ai", "dsa > news", "dsa > planner", "dsa > progress", "dsa > settings", "interview-bank > ai", "interview-bank > news", "jobs > notifications", "jobs > ai", "jobs > planner", "jobs > progress", "jobs > resume",
  "jobs > settings", "jobs > targets", "learn > ai", "learn > design", "learn > news", "learn > progress", "learn > quiz", "learn > resume", "mock > ai", "mock > dsa",
  "mock > planner", "mock > quiz", "mock > settings", "news > planner", "news > settings", "notifications > news", "notifications > planner",
  "notifications > progress", "notifications > resume", "planner > dsa", "planner > jobs", "planner > mock", "planner > news", "planner > notifications",
  "planner > progress", "planner > resume", "planner > settings", "progress > design", "progress > dsa", "progress > jobs", "progress > mock",
  "progress > news", "progress > notifications", "progress > planner", "progress > quiz", "progress > settings", "progress > targets", "quiz > ai",
  "quiz > design", "quiz > dsa", "quiz > planner", "quiz > progress", "quiz > settings", "resume > ai", "resume > jobs", "resume > notifications",
  "resume > settings", "roadmap > course", "roadmap > learn", "roadmap > settings", "settings > ai", "settings > mock", "settings > notifications",
  "settings > planner", "settings > resume", "targets > design", "targets > progress",
  // practice is a read-only aggregator (the Practice hub): it points at leaf modules and nothing points back at it
  // the Stats page shows courses and roadmaps next to studied topics
  "progress > course", "progress > roadmap",
  "practice > design", "practice > dsa", "practice > progress", "practice > quiz", "practice > settings",
  "study-flow > course", "study-flow > planner", "study-flow > practice", "study-flow > roadmap", "study-flow > settings",
  // chat is the read-only assistant: its tools read leaf modules' services and nothing points back at it
  "chat > ai", "chat > course", "chat > dsa", "chat > jobs", "chat > mock", "chat > planner", "chat > progress", "chat > quiz", "chat > roadmap", "chat > settings", "chat > targets",
]);

function moduleEdges(): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const file of MODULE_FILES) {
    const from = file.split("/")[1]!;
    for (const s of specifiers(read(join(ROOT, file)))) {
      const m = /^@\/modules\/([a-z-]+)\//.exec(s);
      if (m && m[1] !== from) edges.set(`${from} > ${m[1]}`, [...(edges.get(`${from} > ${m[1]}`) ?? []), file]);
    }
  }
  return edges;
}

describe("module dependency graph", () => {
  it("has no module-to-module import that is not in the reviewed baseline", () => {
    const fresh = [...moduleEdges()].filter(([edge]) => !BASELINE.has(edge));
    const report = fresh.map(([edge, files]) => `  ${edge}   (${files.slice(0, 3).join(", ")}${files.length > 3 ? ", ..." : ""})`).join("\n");
    expect(fresh, `New module dependencies. Make sure they point the right way, then add them to BASELINE and describe them in docs/STRUCTURE.md:\n${report}`).toEqual([]);
  });

  it("every baseline edge still exists, so the baseline cannot rot", () => {
    const live = new Set(moduleEdges().keys());
    const gone = [...BASELINE].filter((e) => !live.has(e));
    expect(gone, `These imports are gone. Remove them from BASELINE:\n  ${gone.join("\n  ")}`).toEqual([]);
  });

  it("only names modules that exist", () => {
    for (const edge of BASELINE) for (const m of edge.split(" > ")) expect(MODULES, edge).toContain(m);
  });
});

describe("core/", () => {
  /** core/ is the base layer. It may use a module's pure domain/ and lib/; anything else is listed here with a reason. */
  const EXCEPTIONS = new Map<string, string>([
    ["core/llm/index.ts", "wires the provider chain to its Mongo-backed store (modules/ai/services/llm-store)"],
    ["core/sandbox/languages.ts", "loads the TypeScript checker lazily from modules/dsa/lib"],
  ]);

  it("imports from modules only through domain/ or lib/ (core/services is the composition layer and is exempt)", () => {
    const bad: string[] = [];
    for (const file of CORE_FILES) {
      if (EXCEPTIONS.has(file) || file.startsWith("core/services/")) continue;
      for (const s of specifiers(read(join(ROOT, file)))) {
        const m = /^@\/modules\/[a-z-]+\/([a-z-]+)/.exec(s);
        if (m && m[1] !== "domain" && m[1] !== "lib") bad.push(`${file} -> ${s}`);
      }
    }
    expect(bad, "core/ must not depend on a module's services or components:\n  " + bad.join("\n  ")).toEqual([]);
  });
});

describe("modules reaching into app/", () => {
  it("only call a route's Server Actions", () => {
    const bad: string[] = [];
    for (const file of [...MODULE_FILES, ...CORE_FILES]) {
      for (const s of specifiers(read(join(ROOT, file)))) if (s.startsWith("@/app/") && !/actions$/.test(s) && !/\/dashboard\/actions$/.test(s)) bad.push(`${file} -> ${s}`);
    }
    expect(bad, "Only Server Action files may be imported from app/:\n  " + bad.join("\n  ")).toEqual([]);
  });
});

describe("folder layout", () => {
  it("keeps shared UI in components/{ui,shared,layout}", () => {
    const dirs = readdirSync(join(ROOT, "components")).filter((n) => statSync(join(ROOT, "components", n)).isDirectory());
    expect(dirs.toSorted(), "Feature UI belongs in modules/<feature>/components, shared UI in components/shared").toEqual(["layout", "shared", "ui"]);
  });

  it("gives every module the same layers and nothing else at its top", () => {
    const allowed = new Set(["domain", "services", "components", "lib"]);
    for (const m of MODULES) {
      const entries = readdirSync(join(ROOT, "modules", m));
      for (const e of entries) expect(allowed.has(e), `modules/${m}/${e} is not one of domain, services, components, lib`).toBe(true);
      expect(entries.includes("domain"), `modules/${m} needs a domain/ folder (pure rules)`).toBe(true);
    }
  });

  it("keeps domain/ free of UI and server APIs", () => {
    const bad: string[] = [];
    for (const file of MODULE_FILES.filter((f) => f.includes("/domain/"))) {
      const src = read(join(ROOT, file));
      for (const s of specifiers(src)) if (/^(react|react-dom|mongoose|server-only|next(\/.*)?)$/.test(s) || /\/components\//.test(s)) bad.push(`${file} -> ${s}`);
      if (/^\s*"use (client|server)"/m.test(src)) bad.push(`${file} has a use client/use server directive`);
    }
    expect(bad, "domain/ must stay pure:\n  " + bad.join("\n  ")).toEqual([]);
  });
});
