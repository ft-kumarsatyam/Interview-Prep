"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, ExternalLink, RefreshCw, Search } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentProblem, Difficulty } from "@/lib/content";
import type { ProgressSummary } from "@/lib/services/problems";
import { cn } from "@/lib/utils";

const TRACKS = [
  { id: "main", label: "DSA (in JS)", blurb: "Core pass first (151 must-know), then the extended set — pattern by pattern." },
  { id: "js", label: "JavaScript", blurb: "LeetCode 30 Days of JavaScript: closures, promises, debounce, event emitter." },
  { id: "sql", label: "SQL", blurb: "Classic backend SQL questions. One a day from week 4." },
] as const;

type Status = "all" | "todo" | "solved" | "struggled";

function groupByPattern(list: ContentProblem[]): Array<[string, ContentProblem[]]> {
  const groups = new Map<string, ContentProblem[]>();
  for (const p of list) groups.set(p.pattern, [...(groups.get(p.pattern) ?? []), p]);
  return [...groups];
}

export function DsaBrowser({ problems, progress }: { problems: ContentProblem[]; progress: Record<string, ProgressSummary> }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [status, setStatus] = useState<Status>("all");

  const isSolved = (slug: string) => progress[slug]?.status === "solved";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.pattern.toLowerCase().includes(q)) return false;
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      const prog = progress[p.slug];
      if (status === "todo" && prog?.status === "solved") return false;
      if (status === "solved" && prog?.status !== "solved") return false;
      if (status === "struggled" && prog?.confidence !== "struggled") return false;
      return true;
    });
  }, [problems, progress, query, difficulty, status]);

  const core = problems.filter((p) => p.track === "main" && p.tier === "core");
  const coreSolved = core.filter((p) => isSolved(p.slug)).length;
  const filtersActive = query !== "" || difficulty !== "all" || status !== "all";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {TRACKS.map((t) => {
          const list = problems.filter((p) => p.track === t.id);
          const solved = list.filter((p) => isSolved(p.slug)).length;
          return (
            <div key={t.id} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="tabular mt-1 font-mono text-2xl font-semibold">
                {solved} <span className="text-sm text-muted-foreground">/ {list.length}</span>
              </p>
              <Progress value={(solved / Math.max(list.length, 1)) * 100} className="mt-2" aria-label={`${t.label} progress`} />
              {t.id === "main" && (
                <p className={cn("mt-2 text-xs", coreSolved === core.length ? "text-success" : "text-muted-foreground")}>
                  {coreSolved === core.length ? "Core ✅ all 151 done" : `Core: ${coreSolved} / ${core.length}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or pattern" className="pl-8" aria-label="Search problems" />
        </div>
        <FilterPills label="Difficulty" value={difficulty} onChange={setDifficulty} options={["all", "Easy", "Medium", "Hard"] as const} />
        <FilterPills label="Status" value={status} onChange={setStatus} options={["all", "todo", "solved", "struggled"] as const} />
      </div>

      <Tabs defaultValue="main">
        <TabsList>
          {TRACKS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TRACKS.map((t) => {
          const list = filtered.filter((p) => p.track === t.id);
          const passes = t.id === "main" ? (["core", "extended"] as const) : ([null] as const);
          return (
            <TabsContent key={t.id} value={t.id} className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground">{t.blurb}</p>
              {list.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No problems match these filters.</p>}
              {passes.map((tier) => {
                const subset = tier ? list.filter((p) => p.tier === tier) : list;
                if (subset.length === 0) return null;
                const groups = groupByPattern(subset);
                return (
                  <section key={tier ?? "all"}>
                    {tier && (
                      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                        {tier === "core" ? "Pass 1 · Core" : "Pass 2 · Extended"} ({subset.length})
                      </h2>
                    )}
                    <Accordion key={String(filtersActive)} type="multiple" className="rounded-xl border bg-card" defaultValue={filtersActive ? groups.map(([g]) => g) : []}>
                      {groups.map(([pattern, items]) => {
                        const solved = items.filter((p) => isSolved(p.slug)).length;
                        return (
                          <AccordionItem key={pattern} value={pattern} className="px-4">
                            <AccordionTrigger>
                              <span className="flex flex-1 items-center gap-3 pr-2">
                                <span className="flex-1 text-left">{pattern}</span>
                                <Progress value={(solved / items.length) * 100} className="hidden w-24 sm:block" aria-hidden />
                                <span className="tabular font-mono text-xs text-muted-foreground">
                                  {solved}/{items.length}
                                </span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="divide-y">
                                {items.map((p) => (
                                  <ProblemRow key={p.slug} p={p} prog={progress[p.slug]} />
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </section>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function ProblemRow({ p, prog }: { p: ContentProblem; prog?: ProgressSummary }) {
  const solved = prog?.status === "solved";
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-10 font-mono text-xs text-muted-foreground">#{p.order}</span>
      {solved ? (
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Solved" />
      ) : (
        <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-label="Not solved" />
      )}
      <Link href={`/dsa/${p.slug}`} className="min-w-0 flex-1 truncate hover:text-primary hover:underline">
        {p.title}
      </Link>
      {prog?.source === "leetcode" && (
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary sm:inline-flex" title="Imported from LeetCode">
          <RefreshCw className="size-3" /> synced
        </span>
      )}
      {prog?.confidence && <span className="hidden text-xs text-muted-foreground md:inline">{prog.confidence}</span>}
      {prog?.lastSolvedOn && <span className="hidden font-mono text-xs text-muted-foreground lg:inline">{prog.lastSolvedOn}</span>}
      <DifficultyBadge difficulty={p.difficulty} />
      <a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title} on LeetCode`} className="text-muted-foreground hover:text-primary">
        <ExternalLink className="size-3.5" />
      </a>
    </li>
  );
}

function FilterPills<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-2 py-1 text-xs capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
