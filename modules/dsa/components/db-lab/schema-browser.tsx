"use client";

import { ChevronRight, Eye, KeyRound, Link2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Collections } from "@/modules/dsa/domain/mongo-query";
import type { SchemaTable } from "@/modules/dsa/domain/sql-schema";

/** Tables with their columns (types, keys, references) and a one-click preview of the data. */
export function SqlSchemaBrowser({ tables, onPreview }: { tables: SchemaTable[]; onPreview?: (table: string) => void }) {
  return (
    <ul className="space-y-2">
      {tables.map((t) => (
        <li key={t.name}>
          <details open={tables.length <= 3} className="group rounded-lg border bg-card">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
              <Table2 className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{t.name}</span>
              <span className="font-mono text-2xs text-muted-foreground tabular">{t.rows} rows</span>
              {onPreview && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  onClick={(e) => {
                    e.preventDefault();
                    onPreview(t.name);
                  }}
                  aria-label={`Preview ${t.name}`}
                  title={`SELECT * FROM ${t.name}`}
                >
                  <Eye />
                </Button>
              )}
            </summary>
            <ul className="space-y-0.5 border-t px-2.5 py-2 font-mono text-2xs">
              {t.columns.map((c) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  {c.primary ? <KeyRound className="size-3 shrink-0 text-warning" aria-label="Primary key" /> : c.references ? <Link2 className="size-3 shrink-0 text-info" aria-label="Foreign key" /> : <span className="size-3 shrink-0" aria-hidden />}
                  <span className="min-w-0 truncate">{c.name}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {c.type.toLowerCase()}
                    {c.references && ` → ${c.references}`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}

export function MongoSchemaBrowser({ collections, onPreview }: { collections: Collections; onPreview?: (name: string) => void }) {
  return (
    <ul className="space-y-2">
      {Object.entries(collections).map(([name, docs]) => (
        <li key={name}>
          <details open className="group rounded-lg border bg-card">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{name}</span>
              <span className="font-mono text-2xs text-muted-foreground tabular">{docs.length} docs</span>
              {onPreview && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  onClick={(e) => {
                    e.preventDefault();
                    onPreview(name);
                  }}
                  aria-label={`Preview ${name}`}
                  title={`db.${name}.find()`}
                >
                  <Eye />
                </Button>
              )}
            </summary>
            <pre className="overflow-x-auto border-t px-2.5 py-2 font-mono text-2xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify(docs[0], null, 1)}</pre>
          </details>
        </li>
      ))}
    </ul>
  );
}
