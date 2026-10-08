"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, CircleDot, FileText, PlayCircle, Search, SearchX } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils";
import { DESIGN_SHEET_KINDS, type DesignSheetKind, type DesignSheetLevel, type DesignSheetRow, type DesignSheetStatus } from "@/modules/design/domain/design-sheet";

const LEVEL_CLASS: Record<DesignSheetLevel, string> = { Easy: "bg-success/10 text-success", Medium: "bg-warning/10 text-warning", Hard: "bg-destructive/10 text-destructive" };
const STATUS_LABEL: Record<DesignSheetStatus, string> = { todo: "Not started", "in-progress": "In progress", done: "Done" };

function Status({ status }: { status: DesignSheetStatus }) {
  if (status === "done") return <CircleCheck className="size-4 shrink-0 text-success" aria-label={STATUS_LABEL.done} />;
  if (status === "in-progress") return <CircleDot className="size-4 shrink-0 text-warning" aria-label={STATUS_LABEL["in-progress"]} />;
  return <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" aria-label={STATUS_LABEL.todo} />;
}

function Level({ level }: { level: DesignSheetLevel }) {
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", LEVEL_CLASS[level])}>{level}</span>;
}

function Resources({ row }: { row: DesignSheetRow }) {
  const link = "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <span className="flex items-center gap-0.5">
      {row.article && (
        <a href={row.article.url} target="_blank" rel="noreferrer" className={link} aria-label={`Article: ${row.article.label}`} title={row.article.label}>
          <FileText className="size-3.5" />
        </a>
      )}
      <a href={row.video} target="_blank" rel="noreferrer" className={link} aria-label={`Videos on ${row.title}`} title="Find videos">
        <PlayCircle className="size-3.5" />
      </a>
    </span>
  );
}

/** The system design sheet: HLD and LLD questions with status, companies, resources and level. */
export function DesignSheetTable({ rows }: { rows: DesignSheetRow[] }) {
  const [kind, setKind] = useState<DesignSheetKind | "all">("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => (kind === "all" || row.kind === kind) && (!q || `${row.title} ${row.companies.join(" ")}`.toLowerCase().includes(q)));
  }, [rows, kind, query]);
  const done = visible.filter((row) => row.status === "done").length;

  return (
    <section aria-label="System design questions" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Design type">
          <Chip pressed={kind === "all"} onClick={() => setKind("all")} count={rows.length}>All</Chip>
          {DESIGN_SHEET_KINDS.map((k) => (
            <Chip key={k} pressed={kind === k} onClick={() => setKind(k)} count={rows.filter((row) => row.kind === k).length}>{k}</Chip>
          ))}
        </div>
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems or companies" className="pl-9" aria-label="Search system design questions" />
        </div>
        <span className="tabular ml-auto text-sm text-muted-foreground">{done} / {visible.length} done</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState compact title="Nothing matches" icon={SearchX}>Try another search.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-16 px-3 py-2.5 text-left font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Problem</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Companies</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Resources</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5"><Status status={row.status} /></td>
                    <td className="px-3 py-2.5">
                      <Link href={row.href} className="font-medium hover:text-primary">{row.title}</Link>
                      <span className="ml-2 rounded-md border px-1.5 py-0.5 text-2xs text-muted-foreground">{row.kind}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.companies.join(", ") || "-"}</td>
                    <td className="px-3 py-2.5"><Resources row={row} /></td>
                    <td className="px-3 py-2.5"><Level level={row.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {visible.map((row) => (
              <li key={row.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5"><Status status={row.status} /></span>
                  <Link href={row.href} className="min-w-0 flex-1 font-medium">{row.title}</Link>
                  <Level level={row.level} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{row.kind} · {row.companies.join(", ") || "-"}</span>
                  <Resources row={row} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
