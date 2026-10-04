"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addSourceAction, removeSourceAction, setSourceEnabledAction } from "@/app/(app)/jobs/discover-actions";
import { RefreshButton } from "@/components/jobs/refresh-button";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HealthLabel } from "@/lib/domain/job-sync";

export interface SourceView {
  id: string;
  name: string;
  kind: "board" | "aggregator";
  ats: string;
  tierName: string;
  custom: boolean;
  enabled: boolean;
  open: number;
  lastOkAt: string | null;
  lastError: string;
  health: HealthLabel;
}

const HEALTH_TONE: Record<HealthLabel, Tone> = { ok: "success", stale: "warning", "cooling down": "danger", off: "neutral", "never run": "neutral" };
const ATS_LABEL: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", workable: "Workable", smartrecruiters: "SmartRecruiters", remoteok: "Remote OK feed", remotive: "Remotive feed", arbeitnow: "Arbeitnow feed" };

/** Every place PrepOS reads jobs from, how each is doing, and the switch to turn one off. */
export function SourcesManager({ sources, tiers }: { sources: SourceView[]; tiers: Array<{ id: string; name: string }> }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState("startup");
  const [filter, setFilter] = useState("");

  const toggle = (id: string, enabled: boolean) =>
    start(async () => {
      const res = await setSourceEnabledAction({ id, enabled });
      if (!res.ok) toast.error(`${res.error}.`);
    });
  const remove = (s: SourceView) => {
    if (!window.confirm(`Remove ${s.name} and its listed jobs?`)) return;
    start(async () => {
      const res = await removeSourceAction({ id: s.id });
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success(`${s.name} removed`);
    });
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addSourceAction({ url, tier });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setUrl("");
      toast.success(`${res.name} added with ${res.count} open jobs. Press Refresh to load them.`);
    });
  };
  const shown = sources.filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="space-y-3 rounded-xl border bg-card p-4" aria-label="Add a company">
        <p className="text-sm font-medium">Add a company</p>
        <p className="text-xs text-muted-foreground">Paste the link to its job board on Greenhouse, Lever, Ashby, Workable or SmartRecruiters (for example boards.greenhouse.io/acme). PrepOS checks that it has open jobs before saving it.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="src-url">Job board link</Label>
            <Input id="src-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://boards.greenhouse.io/acme" maxLength={500} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-tier">Kind of company</Label>
            <select id="src-tier" value={tier} onChange={(e) => setTier(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11">
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={pending} disabled={!url.trim()}>
            {!pending && <Plus />} Add
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${sources.length} sources`} className="max-w-xs" aria-label="Filter sources" />
          <RefreshButton label="Refresh due sources" />
        </div>
        <ul className="divide-y rounded-xl border bg-card">
          {shown.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={s.enabled} onChange={(e) => toggle(s.id, e.target.checked)} disabled={pending} aria-label={`Read ${s.name}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {s.name} {s.custom && <span className="text-xs font-normal text-muted-foreground">(added by you)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {ATS_LABEL[s.ats] ?? s.ats}
                    {s.tierName ? ` · ${s.tierName}` : ""}
                    {s.lastError && s.health === "cooling down" ? ` · ${s.lastError}` : ""}
                  </span>
                </span>
              </label>
              <span className="tabular font-mono text-xs text-muted-foreground">{s.open} open</span>
              <ToneBadge tone={HEALTH_TONE[s.health]}>{s.health}</ToneBadge>
              <span className="w-24 text-right text-xs text-muted-foreground">{s.lastOkAt ? new Date(s.lastOkAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "never"}</span>
              {s.custom && (
                <Button variant="ghost" size="icon" onClick={() => remove(s)} disabled={pending} aria-label={`Remove ${s.name}`}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
