"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { savePlannerAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES, plannerInputSchema, PRIORITIES, weeklyHours, type PlannerProfile, type PriorityId } from "@/modules/planner/domain/planner-profile";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

export interface PlannerFormValues extends PlannerProfile {
  endDate: string;
  hoursByDow: number[];
}

/** The one editor for your goals, interview date and weekly hours (Settings only shows them). Future days re-plan; today stays frozen. */
export function PlannerForm({ initial, firstTime }: { initial: PlannerFormValues; firstTime: boolean }) {
  const [v, setV] = useState<PlannerFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof PlannerFormValues>(key: K, value: PlannerFormValues[K]) => setV((p) => ({ ...p, [key]: value }));
  const togglePriority = (id: PriorityId) => set("priorities", v.priorities.includes(id) ? v.priorities.filter((p) => p !== id) : [...v.priorities, id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = plannerInputSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])));
      return;
    }
    setErrors({});
    start(async () => {
      const res = await savePlannerAction(parsed.data);
      if (res.ok) toast.success(res.changes ? `Saved. ${res.changes} change${res.changes === 1 ? "" : "s"} logged below.` : "Nothing changed.");
      else {
        if ("fields" in res) setErrors(res.fields);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {firstTime && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm">Set your goals once. The planner uses your hours and interview date for every future day, and logs each change below.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="targetRole">Target role</Label>
          <Input id="targetRole" value={v.targetRole} onChange={(e) => set("targetRole", e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetCompany">Target company (optional)</Label>
          <Input id="targetCompany" value={v.targetCompany} onChange={(e) => set("targetCompany", e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredLanguage">Coding language</Label>
          <select id="preferredLanguage" className={SELECT} value={v.preferredLanguage} onChange={(e) => set("preferredLanguage", e.target.value as PlannerProfile["preferredLanguage"])}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === "javascript" ? "JavaScript" : l === "typescript" ? "TypeScript" : "Python"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Interview date (plan end)</Label>
          <Input id="endDate" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} aria-invalid={!!errors.endDate} />
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Focus areas</legend>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => {
            const on = v.priorities.includes(p.id);
            return (
              <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${on ? "border-primary/50 bg-primary/10" : "text-muted-foreground"}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => togglePriority(p.id)} />
                {p.label}
              </label>
            );
          })}
        </div>
        {errors.priorities && <p className="text-xs text-destructive">{errors.priorities}</p>}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Study hours per day <span className="font-normal text-muted-foreground">· {weeklyHours(v.hoursByDow)} h a week</span>
        </legend>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => (
            <div key={d} className="space-y-1">
              <Label htmlFor={`h-${i}`} className="text-xs text-muted-foreground">
                {d}
              </Label>
              <Input
                id={`h-${i}`}
                inputMode="decimal"
                value={Number.isFinite(v.hoursByDow[i]) ? String(v.hoursByDow[i]) : ""}
                onChange={(e) => set("hoursByDow", v.hoursByDow.map((h, j) => (j === i ? (e.target.value === "" ? Number.NaN : Number(e.target.value)) : h)))}
                aria-invalid={!!errors[`hoursByDow.${i}`]}
                className="h-9 px-2 text-center"
              />
            </div>
          ))}
        </div>
        {Object.keys(errors).some((k) => k.startsWith("hoursByDow")) && <p className="text-xs text-destructive">Hours must be between 0 and 12.</p>}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {!pending && <Save />} {pending ? "Saving…" : firstTime ? "Save my planner" : "Save changes"}
        </Button>
        <p className="text-xs text-muted-foreground">Need a break? Use Pause or skip days above. Other rest days are in Settings.</p>
      </div>
    </form>
  );
}
