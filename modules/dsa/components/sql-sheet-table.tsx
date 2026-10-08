"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, Search, SearchX } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/badges";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { readPref, useHydrated } from "@/modules/dsa/components/ide/use-client-prefs";
import { EXTERNAL_DIFFICULTIES, type ExternalDifficulty } from "@/modules/dsa/domain/external-catalogue";
import type { SqlSheetRow } from "@/modules/dsa/domain/sql-sheet";

const SOURCES = ["LeetCode", "DB Lab"] as const;

function labSolved(): Set<string> {
  try {
    const list = JSON.parse(readPref("db-lab:solved") ?? "[]") as unknown;
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** The SQL sheet, grouped Easy, Medium, Hard. DB Lab solves live on this device, so they appear after hydration. */
export function SqlSheetTable({ rows, solvedProblems }: { rows: SqlSheetRow[]; solvedProblems: string[] }) {
  const hydrated = useHydrated();
  const [source, setSource] = useState<(typeof SOURCES)[number] | "all">("all");
  const [query, setQuery] = useState("");
  const lab = useMemo(() => (hydrated ? labSolved() : new Set<string>()), [hydrated]);
  const problems = useMemo(() => new Set(solvedProblems), [solvedProblems]);
  const isSolved = (row: SqlSheetRow) => (row.solvedBy.kind === "problem" ? problems.has(row.solvedBy.slug) : lab.has(row.solvedBy.id));
  const visible = rows.filter((row) => (source === "all" || row.source === source) && (!query.trim() || `${row.title} ${row.topic}`.toLowerCase().includes(query.trim().toLowerCase())));
  const groups = EXTERNAL_DIFFICULTIES.map((difficulty) => ({ difficulty, rows: visible.filter((row) => row.difficulty === difficulty) })).filter((g) => g.rows.length > 0);

  return (
    <section aria-label="SQL questions" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Source">
          <Chip pressed={source === "all"} onClick={() => setSource("all")} count={rows.length}>All</Chip>
          {SOURCES.map((s) => (
            <Chip key={s} pressed={source === s} onClick={() => setSource(s)} count={rows.filter((row) => row.source === s).length}>{s}</Chip>
          ))}
        </div>
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search queries or topics" className="pl-9" aria-label="Search SQL questions" />
        </div>
        <span className="tabular ml-auto text-sm text-muted-foreground">{visible.filter(isSolved).length} / {visible.length} solved</span>
      </div>
      {groups.length === 0 ? (
        <EmptyState compact title="Nothing matches" icon={SearchX}>Try another search.</EmptyState>
      ) : (
        groups.map((group) => <Group key={group.difficulty} difficulty={group.difficulty} rows={group.rows} isSolved={isSolved} />)
      )}
    </section>
  );
}

function Group({ difficulty, rows, isSolved }: { difficulty: ExternalDifficulty; rows: SqlSheetRow[]; isSolved: (row: SqlSheetRow) => boolean }) {
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <DifficultyBadge difficulty={difficulty} />
        <span className="tabular text-muted-foreground">{rows.filter(isSolved).length} / {rows.length}</span>
      </h2>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
            {isSolved(row) ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Solved" /> : <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" aria-label="Not solved" />}
            <Link href={row.href} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{row.title}</Link>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{row.topic}</span>
            <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-2xs text-muted-foreground">{row.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
