"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, ExternalLink, Filter, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils";
import { LevelBadge } from "@/modules/dsa/components/dsa-progress-card";
import { COMPANY_SORTS, sortCompanyQuestions, type CompanyQuestion, type CompanySort } from "@/modules/dsa/domain/company-tags";
import { LEVELS, levelOf, type Level } from "@/modules/dsa/domain/practice-table";

export type CompanyQuestionRow = CompanyQuestion & { localSlug?: string };

const PAGE = 50;
const SORT_LABEL: Record<CompanySort, string> = { frequency: "Most asked", difficulty: "Difficulty", title: "Title" };
type Status = "all" | "todo" | "solved";

function Title({ row }: { row: CompanyQuestionRow }) {
  if (row.localSlug) {
    return (
      <Link href={`/dsa/${row.localSlug}`} className="font-medium hover:text-primary">
        {row.title}
      </Link>
    );
  }
  return (
    <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-primary">
      {row.title} <ExternalLink className="size-3 text-muted-foreground" aria-label="(opens LeetCode)" />
    </a>
  );
}

function Frequency({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2" title={`Frequency ${value}`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(4, value))}%` }} />
      </span>
      <span className="tabular font-mono text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </span>
  );
}

/** One company's questions for a time window: search, difficulty, topic, status and sort, all client-side. */
export function CompanyQuestionTable({ rows, solved, topics }: { rows: CompanyQuestionRow[]; solved: string[]; topics: string[] }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "all">("all");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<CompanySort>("frequency");
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim().toLowerCase());
  const solvedSet = useMemo(() => new Set(solved), [solved]);

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (q && !row.title.toLowerCase().includes(q)) return false;
      if (level !== "all" && levelOf(row) !== level) return false;
      if (topic && !row.topics.includes(topic)) return false;
      const done = row.localSlug ? solvedSet.has(row.localSlug) : false;
      if (status === "solved" && !done) return false;
      if (status === "todo" && done) return false;
      return true;
    });
    return sortCompanyQuestions(filtered, sort);
  }, [rows, q, level, topic, status, sort, solvedSet]);

  const reset = (fn: () => void) => {
    fn();
    setLimit(PAGE);
  };
  const shown = visible.slice(0, limit);
  const filtering = level !== "all" || topic !== "" || status !== "all";

  return (
    <section aria-label="Company questions" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => reset(() => setQuery(e.target.value))} placeholder="Search questions" className="pl-9" aria-label="Search questions" />
        </div>
        <div className="flex gap-1" role="group" aria-label="Difficulty">
          {(["all", ...LEVELS] as const).map((l) => (
            <Button key={l} size="sm" variant={level === l ? "default" : "outline"} aria-pressed={level === l} onClick={() => reset(() => setLevel(l))}>
              {l === "all" ? "All" : l}
            </Button>
          ))}
        </div>
        <span className="tabular ml-auto text-sm text-muted-foreground">{visible.length.toLocaleString()} questions</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Filter and sort questions" className={cn(filtering && "border-primary/40 text-primary")}>
              <Filter />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
            <DropdownMenuLabel>Sort</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as CompanySort)}>
              {COMPANY_SORTS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>{SORT_LABEL[s]}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={status} onValueChange={(v) => reset(() => setStatus(v as Status))}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="todo">To do</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="solved">Solved</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Topic</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={topic} onValueChange={(v) => reset(() => setTopic(v))}>
              <DropdownMenuRadioItem value="">Any topic</DropdownMenuRadioItem>
              {topics.map((t) => (
                <DropdownMenuRadioItem key={t} value={t}>{t}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {visible.length === 0 ? (
        <EmptyState compact title="Nothing matches" icon={SearchX}>Try another search or clear a filter.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Problem</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Difficulty</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Frequency</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Topics</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((row) => {
                  const done = row.localSlug ? solvedSet.has(row.localSlug) : false;
                  return (
                    <tr key={row.leetcodeSlug} className="hover:bg-muted/40">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          {done ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Solved" /> : <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" aria-label="Not solved" />}
                          <Title row={row} />
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><LevelBadge level={levelOf(row)} /></td>
                      <td className="px-3 py-2.5"><Frequency value={row.frequency} /></td>
                      <td className="max-w-64 truncate px-3 py-2.5 text-xs text-muted-foreground" title={row.topics.join(", ")}>{row.topics.slice(0, 3).join(", ") || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {shown.map((row) => {
              const done = row.localSlug ? solvedSet.has(row.localSlug) : false;
              return (
                <li key={row.leetcodeSlug} className="rounded-xl border bg-card p-3">
                  <div className="flex items-start gap-2">
                    {done ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="Solved" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" aria-label="Not solved" />}
                    <span className="min-w-0 flex-1"><Title row={row} /></span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <LevelBadge level={levelOf(row)} />
                    <Frequency value={row.frequency} />
                  </div>
                  {row.topics.length > 0 && <p className="mt-2 truncate text-xs text-muted-foreground">{row.topics.slice(0, 3).join(", ")}</p>}
                </li>
              );
            })}
          </ul>

          {visible.length > limit && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({visible.length - limit} left)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
