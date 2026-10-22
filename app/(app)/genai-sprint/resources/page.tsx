import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Library } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { genaiPrepResources } from "@/core/genai-prep-pack";
import { RESOURCE_LEVELS, RESOURCE_MODULES, RESOURCE_TYPES } from "@/modules/genai-prep/domain/schemas";

export const metadata: Metadata = { title: "GenAI sprint · Resources" };

export default async function GenaiSprintResourcesPage({ searchParams }: PageProps<"/genai-sprint/resources">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.toLowerCase().trim() ?? "";
  const module = Array.isArray(sp.module) ? sp.module[0] : sp.module;
  const type = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const level = Array.isArray(sp.level) ? sp.level[0] : sp.level;

  let list = genaiPrepResources.resources;
  if (module && RESOURCE_MODULES.includes(module as (typeof RESOURCE_MODULES)[number])) {
    list = list.filter((r) => r.modules.includes(module as (typeof RESOURCE_MODULES)[number]));
  }
  if (type && RESOURCE_TYPES.includes(type as (typeof RESOURCE_TYPES)[number])) {
    list = list.filter((r) => r.type === type);
  }
  if (level && RESOURCE_LEVELS.includes(level as (typeof RESOURCE_LEVELS)[number])) {
    list = list.filter((r) => r.level === level);
  }
  if (q) list = list.filter((r) => `${r.title} ${r.source} ${r.why}`.toLowerCase().includes(q));

  const mk = (key: string, value: string | undefined) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (module) p.set("module", module);
    if (type) p.set("type", type);
    if (level) p.set("level", level);
    if (value) p.set(key, value);
    else p.delete(key);
    const s = p.toString();
    return s ? `?${s}` : "/genai-sprint/resources";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Library}
        title="Resource library"
        description={`${genaiPrepResources.resources.length} curated links from the prep pack. Showing ${list.length}.`}
      />
      <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" action="/genai-sprint/resources" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or why"
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <select name="module" defaultValue={module ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">All modules</option>
          {RESOURCE_MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="level" defaultValue={level ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">All levels</option>
          {RESOURCE_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Filter
        </button>
      </form>
      <p className="text-xs text-muted-foreground">
        Quick filters:{" "}
        <Link href={mk("level", "core")} className="text-primary hover:underline">
          core
        </Link>
        {" · "}
        <Link href={mk("module", "rag")} className="text-primary hover:underline">
          rag
        </Link>
        {" · "}
        <Link href={mk("module", "llm")} className="text-primary hover:underline">
          llm
        </Link>
      </p>
      <ul className="divide-y rounded-lg border">
        {list.map((r) => (
          <li key={r.id} className="px-3 py-3">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="group flex gap-2 text-sm font-medium hover:text-primary">
              <span className="min-w-0 flex-1">{r.title}</span>
              <ExternalLink className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden />
            </a>
            <p className="mt-1 text-xs text-muted-foreground">{r.why}</p>
            <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              <span>{r.source}</span>
              <span>·</span>
              <span>{r.type}</span>
              <span>·</span>
              <span>{r.level}</span>
              {r.modules.map((m) => (
                <span key={m} className="rounded bg-muted px-1">
                  {m}
                </span>
              ))}
              {!r.verified && <span className="rounded bg-warning/15 px-1 text-warning">unverified</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
