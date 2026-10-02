"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Lock, Plus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_NEWS_QUERIES, type SettingsInput } from "@/lib/domain/settings";

export type SettingsFormValues = Omit<SettingsInput, "leetcodeUsername" | "googleNewsQueries"> & {
  leetcodeUsername: string;
  googleNewsQueries: string[];
};

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Chip({ children, onRemove, locked, label }: { children: React.ReactNode; onRemove?: () => void; locked?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-3 text-sm">
      {children}
      {locked ? (
        <Lock className="mx-1 size-3 text-muted-foreground" aria-label="Locked: already planned or past" />
      ) : (
        <button type="button" onClick={onRemove} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${label}`}>
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export function SettingsForm({ initial, today, defaultQueries, timezone }: { initial: SettingsFormValues; today: string; defaultQueries: string[]; timezone: string }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [newRest, setNewRest] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const clearError = (key: string) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  const set = <K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) => {
    clearError(key);
    setV((s) => ({ ...s, [key]: value }));
  };
  const num = (key: keyof SettingsFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError(key);
    setV((s) => ({ ...s, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  };
  const err = (key: string) => errors[key];
  const aria = (key: string) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  const addRest = () => {
    if (!newRest) return;
    if (newRest <= today) return toast.error("Pick a day after today. Today and earlier are already planned.");
    if (!v.restDays.includes(newRest)) set("restDays", [...v.restDays, newRest].toSorted());
    setNewRest("");
  };
  const addQuery = () => {
    const q = newQuery.trim();
    if (q.length < 2) return;
    if (v.googleNewsQueries.length >= MAX_NEWS_QUERIES) return toast.error(`Up to ${MAX_NEWS_QUERIES} keywords`);
    if (!v.googleNewsQueries.includes(q)) set("googleNewsQueries", [...v.googleNewsQueries, q]);
    setNewQuery("");
  };

  const save = () =>
    start(async () => {
      const res = await saveSettingsAction({ ...v, googleNewsQueries: v.googleNewsQueries.length ? v.googleNewsQueries : null });
      if (res.ok) {
        setErrors({});
        toast.success("Settings saved. Plans from tomorrow use the new values.");
      } else {
        setErrors("fields" in res ? res.fields : {});
        toast.error(`${res.error}. Check the highlighted fields.`);
      }
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Today&apos;s plan is frozen once created, so changes apply from tomorrow. Timezone: {timezone} (APP_TIMEZONE).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="startDate" label="Start date" error={err("startDate")}>
            <Input id="startDate" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} {...aria("startDate")} />
          </Field>
          <Field id="endDate" label="End date" error={err("endDate")}>
            <Input id="endDate" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} {...aria("endDate")} />
          </Field>
          <Field id="minDailyDsa" label="Min DSA per day" error={err("minDailyDsa")}>
            <Input id="minDailyDsa" type="number" inputMode="numeric" min={0} max={10} value={v.minDailyDsa} onChange={num("minDailyDsa")} {...aria("minDailyDsa")} />
          </Field>
          <Field id="maxDailyDsa" label="Max DSA per day" error={err("maxDailyDsa")}>
            <Input id="maxDailyDsa" type="number" inputMode="numeric" min={1} max={15} value={v.maxDailyDsa} onChange={num("maxDailyDsa")} {...aria("maxDailyDsa")} />
          </Field>
          <Field id="maxSaturdayDsa" label="Max DSA on Saturday" error={err("maxSaturdayDsa")}>
            <Input id="maxSaturdayDsa" type="number" inputMode="numeric" min={0} max={15} value={v.maxSaturdayDsa} onChange={num("maxSaturdayDsa")} {...aria("maxSaturdayDsa")} />
          </Field>
          <Field id="maxDailyTheory" label="Max theory subtopics per day" error={err("maxDailyTheory")}>
            <Input id="maxDailyTheory" type="number" inputMode="numeric" min={1} max={10} value={v.maxDailyTheory} onChange={num("maxDailyTheory")} {...aria("maxDailyTheory")} />
          </Field>
          <Field id="revisionWeeks" label="Revision weeks at the end" error={err("revisionWeeks")}>
            <Input id="revisionWeeks" type="number" inputMode="numeric" min={0} max={8} value={v.revisionWeeks} onChange={num("revisionWeeks")} {...aria("revisionWeeks")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quizzes and mastery</CardTitle>
          <CardDescription>The daily quiz must be passed to complete a day.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="quizPassPct" label="Daily quiz pass mark (%)" hint="40–100" error={err("quizPassPct")}>
            <Input id="quizPassPct" type="number" inputMode="numeric" min={40} max={100} value={v.quizPassPct} onChange={num("quizPassPct")} {...aria("quizPassPct")} />
          </Field>
          <Field id="topicMasteryPct" label="Topic quiz score for Mastered (%)" hint="50–100" error={err("topicMasteryPct")}>
            <Input id="topicMasteryPct" type="number" inputMode="numeric" min={50} max={100} value={v.topicMasteryPct} onChange={num("topicMasteryPct")} {...aria("topicMasteryPct")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="size-4" /> Rest days
          </CardTitle>
          <CardDescription>A rest day counts as complete and doesn&apos;t break the streak. Past days are locked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input aria-label="Rest day to add" type="date" min={today} value={newRest} onChange={(e) => setNewRest(e.target.value)} className="max-w-48" />
            <Button type="button" variant="outline" onClick={addRest} disabled={!newRest}>
              <Plus /> Add
            </Button>
          </div>
          {err("restDays") && <p className="text-xs text-destructive">{err("restDays")}</p>}
          <div className="flex flex-wrap gap-2">
            {v.restDays.length === 0 && <p className="text-sm text-muted-foreground">No rest days planned.</p>}
            {v.restDays.map((d) => (
              <Chip key={d} label={d} locked={d <= today} onRemove={() => set("restDays", v.restDays.filter((x) => x !== d))}>
                <span className="font-mono text-xs">{d}</span>
              </Chip>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google News keywords</CardTitle>
          <CardDescription>Each keyword becomes a news feed from the last two days. Used by the morning refresh.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              aria-label="Keyword to add"
              placeholder={'e.g. "Node.js" release'}
              value={newQuery}
              maxLength={80}
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addQuery();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addQuery} disabled={newQuery.trim().length < 2}>
              <Plus /> Add
            </Button>
          </div>
          {err("googleNewsQueries") && <p className="text-xs text-destructive">{err("googleNewsQueries")}</p>}
          <div className="flex flex-wrap gap-2">
            {v.googleNewsQueries.map((q) => (
              <Chip key={q} label={q} onRemove={() => set("googleNewsQueries", v.googleNewsQueries.filter((x) => x !== q))}>
                {q}
              </Chip>
            ))}
            {v.googleNewsQueries.length === 0 && <p className="text-sm text-muted-foreground">Empty list means the defaults are used.</p>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => set("googleNewsQueries", defaultQueries)}>
            <RotateCcw /> Reset to defaults
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LeetCode</CardTitle>
          <CardDescription>Your public username. Recent accepted solves are imported automatically (no password needed).</CardDescription>
        </CardHeader>
        <CardContent>
          <Field id="leetcodeUsername" label="Username" hint="Leave empty to turn sync off." error={err("leetcodeUsername")}>
            <Input
              id="leetcodeUsername"
              autoComplete="off"
              spellCheck={false}
              placeholder="your-leetcode-handle"
              value={v.leetcodeUsername}
              onChange={(e) => set("leetcodeUsername", e.target.value)}
              className="max-w-sm"
              {...aria("leetcodeUsername")}
            />
          </Field>
        </CardContent>
      </Card>

      {(dirty || pending) && (
        <div className="sticky bottom-20 z-10 flex items-center justify-end gap-2 lg:bottom-4">
          <Button type="button" variant="outline" className="bg-background shadow-lg" onClick={() => (setV(initial), setErrors({}))} disabled={pending}>
            Discard
          </Button>
          <Button type="submit" disabled={pending} className="shadow-lg">
            <Save /> {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}
