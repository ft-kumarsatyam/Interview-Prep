"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Braces, Copy, FileSpreadsheet, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Cell } from "@/modules/dsa/domain/db-lab";
import { cappedNotice, exportFile, filterRows, nextSort, sortRows, toMarkdown, type ExportFormat, type SortState } from "@/modules/dsa/domain/db-export";
import { cn } from "@/core/utils";

function show(v: Cell): string {
  return v === null ? "NULL" : String(v);
}

function download(format: ExportFormat, columns: string[], rows: Cell[][], base: string) {
  const file = exportFile(format, columns, rows, base);
  const url = URL.createObjectURL(new Blob([file.text], { type: file.type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Saved ${file.name}`);
}

/**
 * A scrollable result grid with a sticky header, click-to-sort columns, a filter box, copy as Markdown and CSV/JSON
 * export. Long results are capped by the engine; `total` is the true count and a notice says when rows are missing.
 */
export function ResultTable({
  columns,
  rows,
  total,
  label,
  title,
  className,
}: {
  columns: string[];
  rows: Cell[][];
  total: number;
  label: string;
  /** Shown left of the row count, e.g. "Your output". */
  title?: string;
  className?: string;
}) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [text, setText] = useState("");
  const view = useMemo(() => {
    const filtered = filterRows(rows, text);
    return sort ? sortRows(filtered, sort.col, sort.dir) : filtered;
  }, [rows, text, sort]);
  const notice = cappedNotice(rows.length, total);
  const fileBase = (title ?? label).toLowerCase();

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdown(columns, view));
      toast.success("Copied as a Markdown table");
    } catch {
      toast.error("Couldn't copy. Select the cells and copy them manually.");
    }
  }

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-lg border", className)}>
      <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/40 px-3 py-1 text-xs">
        {title && <span className="font-medium">{title}</span>}
        <span className="text-muted-foreground tabular" aria-live="polite">
          {text ? `${view.length} of ${rows.length} rows match` : `${total.toLocaleString("en-US")} row${total === 1 ? "" : "s"}`}
          {!text && total > rows.length ? ` (first ${rows.length.toLocaleString("en-US")} shown)` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {rows.length > 0 && (
            <label className="relative">
              <span className="sr-only">Filter {label}</span>
              <Search className="pointer-events-none absolute top-1/2 left-1.5 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Filter rows"
                className="h-7 w-28 rounded-md border bg-background pr-1.5 pl-6 text-xs focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-36"
              />
            </label>
          )}
          <Button type="button" size="icon-sm" variant="ghost" className="size-7" onClick={copyMarkdown} disabled={view.length === 0} aria-label={`Copy ${label} as Markdown`} title="Copy as Markdown">
            <Copy />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" className="size-7" onClick={() => download("csv", columns, view, fileBase)} disabled={view.length === 0} aria-label={`Export ${label} as CSV`} title="Export CSV">
            <FileSpreadsheet />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" className="size-7" onClick={() => download("json", columns, view, fileBase)} disabled={view.length === 0} aria-label={`Export ${label} as JSON`} title="Export JSON">
            <Braces />
          </Button>
        </div>
      </div>
      {notice && (
        <p role="status" className="flex items-start gap-1.5 border-b bg-warning/10 px-3 py-1.5 text-xs text-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden /> {notice}
        </p>
      )}
      <div className="max-h-80 overflow-auto" tabIndex={0} role="region" aria-label={label}>
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 z-[1] bg-card">
            <tr>
              <th scope="col" className="w-10 border-b px-2 py-1.5 text-right font-normal text-muted-foreground">
                #
              </th>
              {columns.map((c, i) => {
                const active = sort?.col === i ? sort.dir : null;
                return (
                  <th key={`${c}-${i}`} scope="col" aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"} className="border-b p-0 font-semibold whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSort((s) => nextSort(s, i))}
                      className="flex w-full items-center gap-1 px-2.5 py-1.5 text-left font-semibold hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                      title={`Sort by ${c}`}
                    >
                      {c}
                      {active === "asc" ? <ArrowUp className="size-3" aria-hidden /> : active === "desc" ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUpDown className="size-3 text-muted-foreground/50" aria-hidden />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center font-sans text-muted-foreground">
                  {rows.length === 0 ? "No rows" : "No rows match the filter"}
                </td>
              </tr>
            )}
            {view.map((r, i) => (
              <tr key={i} className="odd:bg-muted/30 hover:bg-muted/60">
                <td className="px-2 py-1 text-right text-muted-foreground tabular">{i + 1}</td>
                {r.map((v, j) => (
                  <td key={j} className={v === null ? "px-2.5 py-1 whitespace-nowrap text-muted-foreground italic" : typeof v === "number" ? "tabular px-2.5 py-1 text-right whitespace-nowrap" : "px-2.5 py-1 whitespace-nowrap"}>
                    {show(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
