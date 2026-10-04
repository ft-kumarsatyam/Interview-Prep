"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { savePrefsAction } from "@/app/(app)/jobs/discover-actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEVEL_LABEL, LEVELS, splitList, type JobLevel, type JobPrefs } from "@/modules/jobs/domain/job-match";

/** What you are looking for. Drives the match score, the alerts and the briefing. */
export function PrefsForm({ prefs, tiers }: { prefs: JobPrefs; tiers: Array<{ id: string; name: string }> }) {
  const [pending, start] = useTransition();
  const [roles, setRoles] = useState(prefs.roles.join(", "));
  const [locations, setLocations] = useState(prefs.locations.join(", "));
  const [exclude, setExclude] = useState(prefs.excludeCompanies.join(", "));
  const [remoteOk, setRemoteOk] = useState(prefs.remoteOk);
  const [level, setLevel] = useState<JobLevel>(prefs.level);
  const [chosenTiers, setTiers] = useState(new Set(prefs.tiers));
  const [minScore, setMinScore] = useState(prefs.minScore);

  const save = () =>
    start(async () => {
      const res = await savePrefsAction({ roles: splitList(roles, 8), locations: splitList(locations, 8), excludeCompanies: splitList(exclude, 20), remoteOk, level, tiers: [...chosenTiers], minScore });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success("Preferences saved");
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-roles">Roles you want</Label>
          <Input id="p-roles" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="backend, full stack, sde 2" maxLength={400} />
          <p className="text-xs text-muted-foreground">Comma separated. A job&apos;s title is compared with each.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-locs">Places</Label>
          <Input id="p-locs" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Bengaluru, Pune, Hyderabad" maxLength={400} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-ex">Companies to hide</Label>
          <Input id="p-ex" value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="Comma separated" maxLength={800} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Level</Label>
        <div role="group" aria-label="Level" className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <Chip key={l} pressed={level === l} onClick={() => setLevel(l)}>
              {LEVEL_LABEL[l]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Kinds of company (none selected means all)</Label>
        <div role="group" aria-label="Kinds of company" className="flex flex-wrap gap-1.5">
          {tiers.map((t) => (
            <Chip
              key={t.id}
              pressed={chosenTiers.has(t.id)}
              onClick={() =>
                setTiers((s) => {
                  const n = new Set(s);
                  if (!n.delete(t.id)) n.add(t.id);
                  return n;
                })
              }
            >
              {t.name}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm pointer-coarse:min-h-11">
          <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={remoteOk} onChange={(e) => setRemoteOk(e.target.checked)} /> Remote is fine
        </label>
        <label className="flex items-center gap-2 text-sm">
          Alert me at
          <input type="range" min={30} max={95} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Minimum match for alerts" className="w-32 accent-[var(--color-primary)]" />
          <span className="tabular w-10 font-mono">{minScore}%</span>
        </label>
        <Button onClick={save} loading={pending}>
          {!pending && <Save />} Save
        </Button>
      </div>
    </div>
  );
}
