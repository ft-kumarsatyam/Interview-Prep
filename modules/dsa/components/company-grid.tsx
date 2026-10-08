"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMPANY_WINDOW_LABEL, COMPANY_WINDOWS, type CompanyWindow, type DatasetCompany } from "@/modules/dsa/domain/company-tags";

const WINDOW_INDEX: Record<CompanyWindow, number> = { d30: 0, d90: 1, d180: 2, all: 3 };
type RegionFilter = "all" | "global" | "india";
const REGION_LABEL: Record<RegionFilter, string> = { all: "All", global: "Global", india: "Indian" };
const PAGE = 60;

/** Every company in the dataset as a searchable grid, sorted by how many questions it has in a window. */
export function CompanyGrid({ companies }: { companies: DatasetCompany[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [win, setWin] = useState<CompanyWindow>("all");
  const [limit, setLimit] = useState(PAGE);
  const wi = WINDOW_INDEX[win];
  const refilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE);
  };

  const list = useMemo(() => {
    const text = query.trim().toLowerCase();
    return companies
      .filter((c) => (region === "all" || c.region === region) && (!text || c.name.toLowerCase().includes(text)) && c.counts[wi] > 0)
      .toSorted((a, b) => b.counts[wi] - a.counts[wi] || a.name.localeCompare(b.name));
  }, [companies, query, region, wi]);

  return (
    <section className="space-y-3" aria-labelledby="dsa-company-grid-title">
      <div>
        <h2 id="dsa-company-grid-title" className="text-lg font-semibold">Company-wise questions</h2>
        <p className="text-sm text-muted-foreground">{companies.length} companies with community-reported LeetCode tags. Pick one to see its questions by recency and frequency.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => refilter(setQuery)(e.target.value)} placeholder="Search companies" className="pl-9" aria-label="Search companies" />
        </div>
        <div className="flex gap-2" role="group" aria-label="Region">
          {(Object.keys(REGION_LABEL) as RegionFilter[]).map((r) => (
            <Chip key={r} pressed={region === r} onClick={() => refilter(setRegion)(r)}>{REGION_LABEL[r]}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Time window">
          {COMPANY_WINDOWS.map((w) => (
            <Chip key={w} pressed={win === w} onClick={() => refilter(setWin)(w)} className="shrink-0">{COMPANY_WINDOW_LABEL[w]}</Chip>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState compact title="No company matches" icon={Building2}>Try another name, region or time window.</EmptyState>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.slice(0, limit).map((c) => (
              <li key={c.slug}>
                <Link href={`/dsa/companies/${c.slug}${win === "all" ? "" : `?w=${win}`}`} className="flex h-full flex-col rounded-xl border bg-card p-3 ring-1 ring-foreground/5 hover:bg-muted/50">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="tabular mt-1 font-mono text-lg font-semibold">{c.counts[wi]}</span>
                  <span className="text-xs text-muted-foreground">
                    questions{c.region === "india" ? " · India" : ""}
                  </span>
                  <span className="tabular mt-2 text-2xs text-muted-foreground">30d {c.counts[0]} · 3m {c.counts[1]} · 6m {c.counts[2]}</span>
                </Link>
              </li>
            ))}
          </ul>
          {list.length > limit && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({list.length - limit} left)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
