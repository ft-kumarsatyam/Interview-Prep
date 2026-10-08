"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Building2, ChevronRight, Search, Shapes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/utils";
import type { CompanyRegion, CompanyWindow, DatasetCompany } from "@/modules/dsa/domain/company-tags";

const PASS_WINDOWS: { id: CompanyWindow; label: string }[] = [
  { id: "d30", label: "30" },
  { id: "d90", label: "90" },
  { id: "d180", label: "180" },
];

const WINDOW_INDEX: Record<CompanyWindow, number> = { d30: 0, d90: 1, d180: 2, all: 3 };

export function CompanySidebar({ companies, source }: { companies: DatasetCompany[]; source: { url: string; datasetDate: string } }) {
  const [region, setRegion] = useState<CompanyRegion>("global");
  const [query, setQuery] = useState("");
  const [passCompany, setPassCompany] = useState(companies[0]?.slug ?? "");
  const [passWindow, setPassWindow] = useState<CompanyWindow>("d90");

  const list = useMemo(() => {
    const text = query.trim().toLowerCase();
    return companies
      .filter((c) => c.region === region && (!text || c.name.toLowerCase().includes(text)))
      .toSorted((a, b) => b.counts[3] - a.counts[3] || a.name.localeCompare(b.name));
  }, [companies, region, query]);
  const regionTotal = useMemo(() => companies.filter((c) => c.region === region).length, [companies, region]);
  const pass = companies.find((c) => c.slug === passCompany);
  const passCount = pass ? pass.counts[WINDOW_INDEX[passWindow]] : 0;

  return (
    <aside className="space-y-4" aria-label="Companies">
      <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
        <span className="inline-flex rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Company pass</span>
        <h2 className="mt-2 text-base font-semibold">Practice company specific questions</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden /> Topics</span>
          <span className="inline-flex items-center gap-1"><Shapes className="size-3.5" aria-hidden /> Patterns</span>
          <span className="inline-flex items-center gap-1">30 / 90 / 180 days</span>
        </div>
        <label className="mt-3 block text-xs font-medium" htmlFor="company-pass-select">Company</label>
        <select
          id="company-pass-select"
          value={passCompany}
          onChange={(e) => setPassCompany(e.target.value)}
          className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm pointer-coarse:h-11"
        >
          {companies.toSorted((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <div className="mt-2 flex gap-1" role="group" aria-label="Time window in days">
          {PASS_WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={passWindow === w.id}
              onClick={() => setPassWindow(w.id)}
              className={cn("flex-1 rounded-md border px-2 py-1 text-xs", passWindow === w.id ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}
            >
              {w.label} days
            </button>
          ))}
        </div>
        <Link
          href={pass ? `/dsa/companies/${pass.slug}?w=${passWindow}` : "/dsa/companies"}
          className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/70"
        >
          {pass ? `${passCount} ${pass.name} questions` : "Explore companies"} <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-1.5 text-base font-semibold"><Building2 className="size-4 text-primary" aria-hidden /> Top companies</h2>
          <Link href="/dsa/companies" className="text-xs text-muted-foreground hover:text-foreground">{companies.length} total</Link>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" className="pl-9" aria-label="Search companies" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Company region">
          {(["global", "india"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={region === r}
              onClick={() => setRegion(r)}
              className={cn("rounded-md px-2 py-1 text-sm", region === r ? "bg-background font-medium ring-1 ring-foreground/5" : "text-muted-foreground")}
            >
              {r === "global" ? "Global" : "Indian"}
            </button>
          ))}
        </div>
        <ul className="mt-3 flex max-h-96 flex-wrap gap-2 overflow-y-auto">
          {list.slice(0, 60).map((c) => (
            <li key={c.slug}>
              <Link href={`/dsa/companies/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm hover:bg-muted">
                {c.name}
                <span className="tabular rounded-full bg-muted px-1.5 font-mono text-2xs text-muted-foreground">{c.counts[3]}</span>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm text-muted-foreground">No company matches.</li>}
        </ul>
        {list.length > 60 && (
          <Link href="/dsa/companies" className="mt-2 block text-xs text-muted-foreground hover:text-foreground">
            +{list.length - 60} more of {regionTotal}
          </Link>
        )}
        <p className="mt-3 text-2xs text-muted-foreground">
          Community-reported LeetCode tags (<a href={source.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">dataset</a>, {source.datasetDate}).
        </p>
      </div>
    </aside>
  );
}
