"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createProfileFromPrefsAction, deleteProfileAction, saveProfileAction } from "@/app/(app)/jobs/profile-actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEVEL_LABEL, LEVELS, splitList, type JobLevel } from "@/modules/jobs/domain/job-match";
import type { JobProfile } from "@/modules/jobs/domain/job-profile";

export type ProfileView = JobProfile & { id: string };

const BLANK: JobProfile = { name: "", roles: [], locations: [], remoteOk: true, level: "any", tiers: [], excludeCompanies: [], minScore: 60, experienceYears: null, mustKeywords: [], excludeKeywords: [], enabled: true };

/** Create, edit and remove job-search profiles. Each profile filters the jobs read from public company boards and builds its own search links. */
export function ProfilesManager({ profiles, hasPrefs, maxProfiles }: { profiles: ProfileView[]; hasPrefs: boolean; maxProfiles: number }) {
  const [editing, setEditing] = useState<string | "new" | null>(profiles.length === 0 ? "new" : null);
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? profiles.find((p) => p.id === editing) : undefined;

  const remove = (id: string) =>
    start(async () => {
      const res = await deleteProfileAction({ id });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success("Profile removed");
      setEditing(null);
    });

  return (
    <div className="space-y-4">
      <ul className="grid gap-3 md:grid-cols-2" aria-label="Your profiles">
        {profiles.map((p) => (
          <li key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {p.name} {!p.enabled && <span className="text-xs font-normal text-muted-foreground">(paused)</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.roles.join(", ") || "Any role"} · {p.locations.join(", ") || "Any place"}
                  {p.remoteOk ? " · remote ok" : ""}
                  {p.experienceYears !== null ? ` · ${p.experienceYears} yrs` : ""}
                </p>
                {(p.mustKeywords.length > 0 || p.excludeKeywords.length > 0) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.mustKeywords.length > 0 && `Must: ${p.mustKeywords.join(", ")}`}
                    {p.mustKeywords.length > 0 && p.excludeKeywords.length > 0 && " · "}
                    {p.excludeKeywords.length > 0 && `Not: ${p.excludeKeywords.join(", ")}`}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(p.id)}>
                Edit<span className="sr-only"> {p.name}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing === null && (
        <div className="flex flex-wrap gap-2">
          {profiles.length < maxProfiles && (
            <Button type="button" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden /> New profile
            </Button>
          )}
          {profiles.length === 0 && hasPrefs && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createProfileFromPrefsAction();
                  if (!res.ok) return void toast.error(`${res.error}.`);
                  toast.success("Profile created from your preferences");
                })
              }
            >
              Start from my preferences
            </Button>
          )}
        </div>
      )}

      {editing !== null && (
        <ProfileForm
          key={editing}
          initial={current ?? BLANK}
          isNew={!current}
          pending={pending}
          onCancel={() => setEditing(null)}
          onDelete={current ? () => remove(current.id) : undefined}
          onSave={(profile) =>
            start(async () => {
              const res = await saveProfileAction({ id: current?.id ?? null, profile });
              if (!res.ok) return void toast.error(`${res.error}.`);
              toast.success("Profile saved");
              setEditing(null);
            })
          }
        />
      )}
    </div>
  );
}

function ProfileForm({ initial, isNew, pending, onSave, onCancel, onDelete }: { initial: JobProfile; isNew: boolean; pending: boolean; onSave: (p: JobProfile) => void; onCancel: () => void; onDelete?: (() => void) | undefined }) {
  const [name, setName] = useState(initial.name);
  const [roles, setRoles] = useState(initial.roles.join(", "));
  const [locations, setLocations] = useState(initial.locations.join(", "));
  const [years, setYears] = useState(initial.experienceYears === null ? "" : String(initial.experienceYears));
  const [must, setMust] = useState(initial.mustKeywords.join(", "));
  const [not, setNot] = useState(initial.excludeKeywords.join(", "));
  const [exclude, setExclude] = useState(initial.excludeCompanies.join(", "));
  const [remoteOk, setRemoteOk] = useState(initial.remoteOk);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [level, setLevel] = useState<JobLevel>(initial.level);
  const [minScore, setMinScore] = useState(initial.minScore);

  const submit = () =>
    onSave({
      ...initial,
      name,
      roles: splitList(roles, 8),
      locations: splitList(locations, 8),
      experienceYears: years.trim() === "" || Number.isNaN(Number(years)) ? null : Number(years),
      mustKeywords: splitList(must, 10),
      excludeKeywords: splitList(not, 10),
      excludeCompanies: splitList(exclude, 20),
      remoteOk,
      enabled,
      level,
      minScore,
    });

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-base font-semibold">{isNew ? "New profile" : `Edit ${initial.name}`}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">Profile name</Label>
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Backend, Bengaluru" maxLength={40} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-years">Your years of experience</Label>
          <Input id="pf-years" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} placeholder="2 (blank = no filter)" maxLength={4} />
          <p className="text-xs text-muted-foreground">Jobs asking for more than one extra year are hidden.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-roles">Roles</Label>
          <Input id="pf-roles" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="backend, sde 2" maxLength={400} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-locs">Places</Label>
          <Input id="pf-locs" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Bengaluru, Pune" maxLength={400} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-must">Must mention</Label>
          <Input id="pf-must" value={must} onChange={(e) => setMust(e.target.value)} placeholder="node, postgres" maxLength={400} />
          <p className="text-xs text-muted-foreground">Every word must be in the title, team or skills.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-not">Must not mention</Label>
          <Input id="pf-not" value={not} onChange={(e) => setNot(e.target.value)} placeholder="php, wordpress" maxLength={400} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pf-ex">Companies to hide</Label>
          <Input id="pf-ex" value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="Comma separated" maxLength={800} />
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
      <div className="flex flex-wrap items-center gap-2">
        <Chip pressed={remoteOk} onClick={() => setRemoteOk((v) => !v)}>
          Remote is fine
        </Chip>
        <Chip pressed={enabled} onClick={() => setEnabled((v) => !v)}>
          {enabled ? "Active (included in alerts)" : "Paused"}
        </Chip>
        <label className="flex items-center gap-2 text-sm" htmlFor="pf-min">
          Alert at
          <Input id="pf-min" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-20" />%
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" aria-hidden /> Save profile
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete && (
          <Button type="button" variant="outline" disabled={pending} onClick={onDelete} className="ml-auto">
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        )}
      </div>
    </form>
  );
}
