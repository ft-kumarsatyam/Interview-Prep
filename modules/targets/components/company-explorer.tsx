"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { addTargetAction } from "@/app/(app)/targets/actions";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";
import { catalogueRegions, filterCompanies, type Company, type TierId, type TierProfile } from "@/modules/targets/domain/companies";

/** Browse and search the whole catalogue by kind of company and region; one tap adds a company as a target. */
export function CompanyExplorer({ tiers, companies, added, disabled }: { tiers: TierProfile[]; companies: Company[]; added: string[]; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierId | "all">("all");
  const [region, setRegion] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const regions = useMemo(() => catalogueRegions(companies), [companies]);
  const shown = useMemo(() => filterCompanies(companies, { query, tier, region }), [companies, query, tier, region]);
  const have = useMemo(() => new Set(added.map((n) => n.toLowerCase())), [added]);
  const tierName = (id: TierId) => tiers.find((t) => t.id === id)?.name ?? id;
  const countIn = (id: TierId) => companies.filter((c) => c.tier === id).length;

  function add(c: Company) {
    setBusy(c.id);
    start(async () => {
      const res = await addTargetAction({ companyId: c.id, priority: "target", interviewDate: null });
      setBusy(null);
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(`${c.name} added`);
      router.push(`/targets/${res.id}`);
    });
  }

  return (
    <section aria-label="Company catalogue" className="space-y-3 rounded-xl border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${companies.length} companies or sectors (payments, open-source, AI…)`} className="pl-8" aria-label="Search companies" />
      </div>
      <div role="group" aria-label="Kind of company" className="flex flex-wrap gap-1.5">
        <Chip pressed={tier === "all"} onClick={() => setTier("all")} count={companies.length}>
          All
        </Chip>
        {tiers.map((t) => (
          <Chip key={t.id} pressed={tier === t.id} onClick={() => setTier(t.id)} count={countIn(t.id)}>
            {t.name}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label="Region" className="flex flex-wrap gap-1.5">
        <Chip pressed={region === "all"} onClick={() => setRegion("all")}>
          Anywhere
        </Chip>
        {regions.map((r) => (
          <Chip key={r} pressed={region === r} onClick={() => setRegion(r)}>
            {r}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No match. Use “Type my own” below to add any company and choose its kind.</p>
      ) : (
        <ul className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => {
            const isAdded = have.has(c.name.toLowerCase());
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[tierName(c.tier), c.region, c.sector].filter(Boolean).join(" · ")}</p>
                </div>
                {isAdded ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="size-3.5" aria-hidden /> Added
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => add(c)}
                    disabled={disabled || pending}
                    aria-label={`Add ${c.name} as a target`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 pointer-coarse:size-11"
                  >
                    {busy === c.id ? <span className="text-xs">…</span> : <Plus className="size-4" aria-hidden />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {shown.length} of {companies.length} shown. Added with “Target” priority; change priority and the interview date on its page.
      </p>
    </section>
  );
}
