import type { Cell } from "@/lib/domain/db-lab";

function show(v: Cell): string {
  return v === null ? "NULL" : String(v);
}

/** A scrollable result grid with a sticky header. Long results are capped by the caller; `total` is the true count. */
export function ResultTable({ columns, rows, total, label }: { columns: string[]; rows: Cell[][]; total: number; label: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="max-h-80 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label={label}>
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="sticky top-0 bg-muted">
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
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-muted/30">
                <td className="px-2 py-1 text-right text-muted-foreground">{i + 1}</td>
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
      <p className="text-xs text-muted-foreground">
        {total} row{total === 1 ? "" : "s"}
        {total > rows.length ? ` (first ${rows.length} shown)` : ""}
      </p>
    </div>
  );
}
