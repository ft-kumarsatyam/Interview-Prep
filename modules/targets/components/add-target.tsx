"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addTargetAction } from "@/app/(app)/targets/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIORITIES, PRIORITY_LABEL, type Company, type TargetPriority, type TierId, type TierProfile } from "@/modules/targets/domain/companies";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11";

/** Add a target: pick a known company (its tier comes with it) or type your own and choose the kind of company. */
export function AddTarget({ tiers, companies, disabled }: { tiers: TierProfile[]; companies: Company[]; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"catalogue" | "custom">("catalogue");
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<TierId>("mid-tier");
  const [priority, setPriority] = useState<TargetPriority>("target");
  const [date, setDate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addTargetAction({
        ...(mode === "catalogue" ? { companyId } : { name, tier }),
        priority,
        interviewDate: date || null,
      });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success("Target added");
      router.push(`/targets/${res.id}`);
    });
  }

  const picked = companies.find((c) => c.id === companyId);
  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-4" aria-label="Add a target company">
      <div role="group" aria-label="How to choose" className="flex gap-1.5">
        <Chip pressed={mode === "catalogue"} onClick={() => setMode("catalogue")}>
          Pick a company
        </Chip>
        <Chip pressed={mode === "custom"} onClick={() => setMode("custom")}>
          Type my own
        </Chip>
      </div>

      {mode === "catalogue" ? (
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <select id="company" className={SELECT} value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
            <option value="">Choose…</option>
            {tiers.map((t) => (
              <optgroup key={t.id} label={t.name}>
                {companies
                  .filter((c) => c.tier === t.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {picked && <p className="text-xs text-muted-foreground">Prep profile: {tiers.find((t) => t.id === picked.tier)?.name}. You can change it later.</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Acme Labs" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tier">Kind of company</Label>
            <select id="tier" className={SELECT} value={tier} onChange={(e) => setTier(e.target.value as TierId)}>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}: {t.short}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>How much do you want it?</Label>
          <div role="group" aria-label="Priority" className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <Chip key={p} pressed={priority === p} onClick={() => setPriority(p)}>
                {PRIORITY_LABEL[p]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Interview date (optional)</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <Button type="submit" loading={pending} disabled={disabled || (mode === "catalogue" ? !companyId : name.trim().length < 2)}>
        {!pending && <Plus />} Add target
      </Button>
      {disabled && <p className="text-xs text-muted-foreground">You have reached the limit. Remove a target to add another.</p>}
    </form>
  );
}
