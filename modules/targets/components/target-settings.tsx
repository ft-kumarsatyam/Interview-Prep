"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeTargetAction, updateTargetAction } from "@/app/(app)/targets/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, PRIORITY_LABEL, type TargetPriority, type TierId, type TierProfile } from "@/modules/targets/domain/companies";

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11";

export function TargetSettings({
  id,
  name,
  tier,
  priority,
  interviewDate,
  notes,
  tiers,
}: {
  id: string;
  name: string;
  tier: TierId;
  priority: TargetPriority;
  interviewDate: string | null;
  notes: string;
  tiers: TierProfile[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ tier, priority, date: interviewDate ?? "", notes });
  const dirty = v.tier !== tier || v.priority !== priority || v.date !== (interviewDate ?? "") || v.notes !== notes;

  const save = () =>
    start(async () => {
      const res = await updateTargetAction({ id, tier: v.tier, priority: v.priority, interviewDate: v.date || null, notes: v.notes });
      if (res.ok) toast.success("Saved. The prep set follows the kind of company you chose.");
      else toast.error(`${res.error}.`);
    });
  const remove = () => {
    if (!window.confirm(`Stop preparing for ${name}? Your progress on problems and topics stays.`)) return;
    start(async () => {
      const res = await removeTargetAction(id);
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success("Target removed");
      router.push("/targets");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-tier">Kind of company</Label>
          <select id="t-tier" className={SELECT} value={v.tier} onChange={(e) => setV((s) => ({ ...s, tier: e.target.value as TierId }))}>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{tiers.find((t) => t.id === v.tier)?.short}. This decides the DSA mix, design cases and subject emphasis.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-date">Interview date</Label>
          <Input id="t-date" type="date" value={v.date} onChange={(e) => setV((s) => ({ ...s, date: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <div role="group" aria-label="Priority" className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => (
            <Chip key={p} pressed={v.priority === p} onClick={() => setV((s) => ({ ...s, priority: p }))}>
              {PRIORITY_LABEL[p]}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Higher priority puts this company&apos;s gaps nearer the top of your backlog.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-notes">Notes</Label>
        <Textarea id="t-notes" value={v.notes} onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))} maxLength={2000} placeholder="Recruiter said round 1 is DSA, the team uses Go…" className="min-h-24" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} loading={pending} disabled={!dirty}>
          {!pending && <Save />} Save changes
        </Button>
        <Button variant="ghost" className="ml-auto text-destructive" onClick={remove} disabled={pending}>
          <Trash2 /> Remove target
        </Button>
      </div>
    </div>
  );
}
