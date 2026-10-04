"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Cell } from "@/lib/domain/db-lab";
import { cn } from "@/lib/utils";

function show(v: Cell): string {
  return v === null ? "NULL" : String(v);
}

function toCsv(columns: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

/** A scrollable result grid with a sticky header. Long results are capped by the caller; `total` is the true count. */
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
  async function copy() {
    try {
      await navigator.clipboard.writeText(toCsv(columns, rows));
      toast.success("Copied as CSV");
    } catch {
      toast.error("Couldn't copy. Select the cells and copy them manually.");
    }
  }

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-lg border", className)}>
      <div className="flex min-h-9 items-center gap-2 border-b bg-muted/40 px-3 text-xs">
        {title && <span className="font-medium">{title}</span>}
        <span className="text-muted-foreground tabular">
          {total} row{total === 1 ? "" : "s"}
          {total > rows.length ? ` (first ${rows.length} shown)` : ""}
        </span>
        <Button type="button" size="icon-sm" variant="ghost" className="ml-auto size-7" onClick={copy} disabled={rows.length === 0} aria-label={`Copy ${label} as CSV`} title="Copy as CSV">
          <Copy />
        </Button>
      </div>
      <div className="max-h-80 overflow-auto" tabIndex={0} role="region" aria-label={label}>
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 z-[1] bg-card">
            <tr>
              <th scope="col" className="w-10 border-b px-2 py-1.5 text-right font-normal text-muted-foreground">
                #
              </th>
              {columns.map((c, i) => (
                <th key={`${c}-${i}`} scope="col" className="border-b px-2.5 py-1.5 font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-4 text-center font-sans text-muted-foreground">
                  No rows
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
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
