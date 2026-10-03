"use client";

import { ExtensionStatus } from "@/components/settings/extension-status";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CalendarDays, CalendarOff, Clock, Code2, Gauge, Lock, Newspaper, Plus, RotateCcw, Save, Sparkles, Timer, Wallet, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsSectionsAction, testLeetCodeAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASK_SUBJECTS } from "@/lib/domain/ask-subjects";
import { MAX_NEWS_QUERIES, MAX_REST_DAYS, SETTINGS_SECTION_LABEL, changedSections, mergeSections, sectionOfPath, settingsInputSchema, type SettingsInput } from "@/lib/domain/settings";
import { formatDuration } from "@/lib/domain/time-budget";
import { cn } from "@/lib/utils";

export type SettingsFormValues = Omit<
  SettingsInput,
  "leetcodeUsername" | "googleNewsQueries" | "hoursByDow" | "llmPaidEnabled" | "llmPaidDailyCap" | "llmPaidRequireConfirm" | "geminiLinks" | "mockDsaWeekday" | "mockHldWeekday"
> & {
  mockDsaWeekday: number;
  mockHldWeekday: number;
  /** Subject id -> your Gemini project link ("" = none). */
  geminiLinks: Record<string, string>;
  llmPaidEnabled: boolean;
  llmPaidDailyCap: number | "";
  llmPaidRequireConfirm: boolean;
  leetcodeUsername: string;
  googleNewsQueries: string[];
  /** Study hours per day of week, Sunday first. */
  hoursByDow: Array<number | "">;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((value) => ({ value, label: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][value] }));
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";
const CHECKBOX = "mt-0.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

const toPayload = (v: SettingsFormValues) => ({ ...v, googleNewsQueries: v.googleNewsQueries.length ? v.googleNewsQueries : null });

function validate(v: SettingsFormValues): Record<string, string> {
  const parsed = settingsInputSchema.safeParse(toPayload(v));
  if (parsed.success) return {};
  return Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
}

/** Maps a validation path to the input that should receive focus. */
function inputIdFor(key: string): string {
  if (key.startsWith("geminiLinks.")) return `gemini-${key.slice("geminiLinks.".length)}`;
  if (key.startsWith("hoursByDow")) return `hours-${key.split(".")[1] ?? 0}`;
  if (key.startsWith("endDate")) return "startDate";
  if (key.startsWith("restDays")) return "newRestDay";
  if (key.startsWith("googleNewsQueries")) return "newQuery";
  return key.split(".")[0];
}

function prettyDay(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  action,
  children,
  contentClassName,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <Card id={id} className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden /> {title}
        </CardTitle>
        <CardDescription className="text-pretty">{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase first:pt-0">{children}</h2>;
}

function Chip({ children, onRemove, locked, label }: { children: React.ReactNode; onRemove?: () => void; locked?: boolean; label: string }) {
  return (
    <span className={cn("inline-flex h-9 items-center gap-1 rounded-full border pl-3 text-sm", locked ? "pr-3 text-muted-foreground" : "pr-1")}>
      {children}
      {locked ? (
        <>
          <Lock className="ml-1 size-3" aria-hidden />
          <span className="sr-only">(locked: already planned or past)</span>
        </>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          aria-label={`Remove ${label}`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

export function SettingsForm({ initial, today, defaultQueries, timezone }: { initial: SettingsFormValues; today: string; defaultQueries: string[]; timezone: string }) {
  const [v, setV] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [newRest, setNewRest] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [testingLc, setTestingLc] = useState(false);
  const dirtySections = changedSections(toPayload(v), toPayload(baseline));
  const dirty = dirtySections.length > 0;
  const errors = attempted ? { ...serverErrors, ...validate(v) } : serverErrors;
  const errorCount = Object.keys(errors).length;
  const weeklyMinutes = v.hoursByDow.reduce<number>((sum, h) => sum + (typeof h === "number" ? h : 0) * 60, 0);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clearServerError = (key: string) =>
    setServerErrors((e) => (Object.keys(e).some((k) => k.startsWith(key)) ? Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(key))) : e));
  const set = <K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) => {
    clearServerError(key);
    setV((s) => ({ ...s, [key]: value }));
  };
  const num = (key: keyof SettingsFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearServerError(key);
    setV((s) => ({ ...s, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  };
  const err = (key: string) => errors[key];
  const aria = (key: string, id = key) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {});

  const addRest = () => {
    if (!newRest) return;
    if (newRest <= today) return toast.error("Pick a day after today. Today and earlier are already planned.");
    if (v.restDays.length >= MAX_REST_DAYS) return toast.error(`Up to ${MAX_REST_DAYS} rest days. Remove one first.`);
    if (!v.restDays.includes(newRest)) set("restDays", [...v.restDays, newRest].toSorted());
    setNewRest("");
  };
  const addQuery = () => {
    const q = newQuery.trim();
    if (q.length < 2) return;
    if (v.googleNewsQueries.length >= MAX_NEWS_QUERIES) return toast.error(`Up to ${MAX_NEWS_QUERIES} keywords. Remove one first.`);
    if (!v.googleNewsQueries.includes(q)) set("googleNewsQueries", [...v.googleNewsQueries, q]);
    setNewQuery("");
  };

  const focusFirst = (keys: string[]) => {
    const el = keys.map((k) => document.getElementById(inputIdFor(k))).find((x): x is HTMLElement => !!x);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  };

  const discard = () => {
    setV(baseline);
    setAttempted(false);
    setServerErrors({});
  };

  const save = () => {
    setAttempted(true);
    const sections = dirtySections;
    if (sections.length === 0) return;
    // A section with a local error is skipped, so it can't hold up the others.
    const local = Object.fromEntries(Object.entries(validate(v)).filter(([k]) => sections.includes(sectionOfPath(k) as never)));
    const blocked = new Set(Object.keys(local).map((k) => sectionOfPath(k)));
    const toSave = sections.filter((id) => !blocked.has(id));
    if (toSave.length === 0) {
      const n = Object.keys(local).length;
      toast.error(`${n} field${n === 1 ? " needs" : "s need"} fixing. Jumped to the first one.`);
      focusFirst(Object.keys(local));
      return;
    }
    start(async () => {
      const res = await saveSettingsSectionsAction({ sections: toSave, values: toPayload(v) });
      if (!res.ok) {
        toast.error(`${res.error}. Try again.`);
        return;
      }
      const { saved, failed, values } = res;
      if (saved.length > 0) {
        setBaseline((b) => mergeSections(b, { ...v, leetcodeUsername: values.leetcodeUsername ?? "" }, saved));
        if (saved.includes("integrations")) setV((cur) => ({ ...cur, leetcodeUsername: values.leetcodeUsername ?? "" }));
      }
      const fields = { ...local, ...Object.assign({}, ...failed.map((f) => f.fields)) } as Record<string, string>;
      setServerErrors(fields);
      setAttempted(Object.keys(local).length > 0);
      const names = (ids: readonly string[]) => ids.map((id) => SETTINGS_SECTION_LABEL[id as keyof typeof SETTINGS_SECTION_LABEL]).join(", ");
      const stillBlocked = [...failed.map((f) => f.section), ...[...blocked].filter((x): x is NonNullable<typeof x> => !!x)];
      if (stillBlocked.length === 0) toast.success("Settings saved. Tomorrow's plan uses the new values.");
      else {
        toast.error(`${saved.length ? `Saved ${names(saved)}. ` : ""}Not saved: ${names(stillBlocked)}. Fix the highlighted fields.`);
        focusFirst(Object.keys(fields));
      }
    });
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <GroupHeading>Plan and daily targets</GroupHeading>

      <Section
        id="plan"
        icon={CalendarDays}
        title="Plan and targets"
        description={
          <>
            Today&apos;s plan is frozen once created, so changes apply from tomorrow. Timezone: <span className="font-mono text-xs">{timezone}</span> (APP_TIMEZONE).
          </>
        }
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="startDate" label="Start date" error={err("startDate")}>
            <Input id="startDate" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} {...aria("startDate")} />
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Interview date (plan end)</p>
            <p className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="tabular-nums">{prettyDay(v.endDate)}</span>
              <Link href="/plan" className="text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">Edit on the Planner</Link>
            </p>
            {err("endDate") && (
              <p className="text-xs text-destructive" role="alert">
                {err("endDate")} Move the start date, or change the interview date on the Planner.
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field id="minDailyDsa" label="Min DSA / day" hint="0–10" error={err("minDailyDsa")}>
            <Input id="minDailyDsa" type="number" inputMode="numeric" min={0} max={10} value={v.minDailyDsa} onChange={num("minDailyDsa")} {...aria("minDailyDsa")} />
          </Field>
          <Field id="maxDailyDsa" label="Max DSA / day" hint="1–15" error={err("maxDailyDsa")}>
            <Input id="maxDailyDsa" type="number" inputMode="numeric" min={1} max={15} value={v.maxDailyDsa} onChange={num("maxDailyDsa")} {...aria("maxDailyDsa")} />
          </Field>
          <Field id="maxSaturdayDsa" label="Max DSA Saturday" hint="0–15" error={err("maxSaturdayDsa")}>
            <Input id="maxSaturdayDsa" type="number" inputMode="numeric" min={0} max={15} value={v.maxSaturdayDsa} onChange={num("maxSaturdayDsa")} {...aria("maxSaturdayDsa")} />
          </Field>
          <Field id="maxDailyTheory" label="Max theory / day" hint="Subtopics, 1–10" error={err("maxDailyTheory")}>
            <Input id="maxDailyTheory" type="number" inputMode="numeric" min={1} max={10} value={v.maxDailyTheory} onChange={num("maxDailyTheory")} {...aria("maxDailyTheory")} />
          </Field>
          <Field id="revisionWeeks" label="Revision weeks" hint="At the end, 0–8" error={err("revisionWeeks")}>
            <Input id="revisionWeeks" type="number" inputMode="numeric" min={0} max={8} value={v.revisionWeeks} onChange={num("revisionWeeks")} {...aria("revisionWeeks")} />
          </Field>
        </div>
      </Section>

      <Section
        id="hours"
        icon={Clock}
        title="Study hours"
        description="Your weekly hours and interview date are edited on the Planner, together with your goals, so they live in one place."
        action={<span className="tabular rounded-full bg-muted px-2.5 py-1 font-mono text-xs whitespace-nowrap">{formatDuration(weeklyMinutes)} / week</span>}
      >
        <dl className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-7">
          {DAY_NAMES.map((name, i) => (
            <div key={name} className="rounded-md border px-2 py-1.5 text-center sm:text-left">
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="tabular-nums text-sm font-medium">{v.hoursByDow[i] === "" || v.hoursByDow[i] === undefined ? 0 : v.hoursByDow[i]} h</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          <Link href="/plan" className="text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none">Edit on the Planner</Link>
          <span className="text-muted-foreground"> · You can also change today only from the dashboard.</span>
        </p>
      </Section>

      <Section id="quiz" icon={Gauge} title="Quiz and mastery" description="The daily quiz must be passed to complete a day." contentClassName="grid gap-4 sm:grid-cols-2">
        <Field id="quizPassPct" label="Daily quiz pass mark (%)" hint="40–100" error={err("quizPassPct")}>
          <Input id="quizPassPct" type="number" inputMode="numeric" min={40} max={100} value={v.quizPassPct} onChange={num("quizPassPct")} {...aria("quizPassPct")} />
        </Field>
        <Field id="topicMasteryPct" label="Topic quiz score for Mastered (%)" hint="50–100" error={err("topicMasteryPct")}>
          <Input id="topicMasteryPct" type="number" inputMode="numeric" min={50} max={100} value={v.topicMasteryPct} onChange={num("topicMasteryPct")} {...aria("topicMasteryPct")} />
        </Field>
      </Section>

      <Section
        id="mocks"
        icon={Timer}
        title="Weekly mocks"
        description="The days your weekly DSA and System Design mocks are scheduled. They show on the dashboard and calendar and never affect the streak."
        contentClassName="grid gap-4 sm:grid-cols-2"
      >
        <Field id="mockDsaWeekday" label="DSA mock day">
          <select id="mockDsaWeekday" className={SELECT} value={v.mockDsaWeekday} onChange={(e) => set("mockDsaWeekday", Number(e.target.value))}>
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="mockHldWeekday" label="System design mock day">
          <select id="mockHldWeekday" className={SELECT} value={v.mockHldWeekday} onChange={(e) => set("mockHldWeekday", Number(e.target.value))}>
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        id="rest-days"
        icon={CalendarOff}
        title="Rest days"
        description="A rest day counts as complete and doesn't break the streak. Past days are locked."
        contentClassName="space-y-3"
      >
        <div className="flex gap-2">
          <Input
            id="newRestDay"
            aria-label="Rest day to add"
            type="date"
            min={today}
            value={newRest}
            onChange={(e) => setNewRest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRest();
              }
            }}
            className="h-9 max-w-52 flex-1"
          />
          <Button type="button" variant="outline" className="h-9" onClick={addRest} disabled={!newRest}>
            <Plus aria-hidden /> Add
          </Button>
        </div>
        {err("restDays") && (
          <p className="text-xs text-destructive" role="alert">
            {err("restDays")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {v.restDays.length === 0 && <p className="text-sm text-muted-foreground">No rest days planned.</p>}
          {v.restDays.map((d) => (
            <Chip key={d} label={prettyDay(d)} locked={d <= today} onRemove={() => set("restDays", v.restDays.filter((x) => x !== d))}>
              <time dateTime={d} className="tabular text-xs">
                {prettyDay(d)}
              </time>
            </Chip>
          ))}
        </div>
      </Section>

      <GroupHeading>Integrations</GroupHeading>

      <Section
        id="leetcode"
        icon={Code2}
        title="LeetCode"
        description="Your public username. Recent accepted solves are imported automatically (no password needed)."
      >
        <Field id="leetcodeUsername" label="Username" hint="Leave empty to turn sync off." error={err("leetcodeUsername")}>
          <Input
            id="leetcodeUsername"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="your-leetcode-handle"
            value={v.leetcodeUsername}
            onChange={(e) => set("leetcodeUsername", e.target.value)}
            className="max-w-sm"
            {...aria("leetcodeUsername")}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={!v.leetcodeUsername.trim()}
          loading={testingLc}
          onClick={() => {
            setTestingLc(true);
            testLeetCodeAction(v.leetcodeUsername).then((res) => {
              setTestingLc(false);
              if (res.ok) toast.success(res.message);
              else toast.error(res.error);
            });
          }}
        >
          Test username
        </Button>
      </Section>

      <Section
        id="news"
        icon={Newspaper}
        title="Google News keywords"
        description="Each keyword becomes a news feed from the last two days. Used by the morning refresh."
        action={
          <span className="tabular font-mono text-xs text-muted-foreground">
            {v.googleNewsQueries.length}/{MAX_NEWS_QUERIES}
          </span>
        }
        contentClassName="space-y-3"
      >
        <div className="flex gap-2">
          <Input
            id="newQuery"
            aria-label="Keyword to add"
            placeholder={'e.g. "Node.js" release'}
            value={newQuery}
            maxLength={80}
            className="h-9"
            onChange={(e) => setNewQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQuery();
              }
            }}
          />
          <Button type="button" variant="outline" className="h-9" onClick={addQuery} disabled={newQuery.trim().length < 2}>
            <Plus aria-hidden /> Add
          </Button>
        </div>
        {Object.keys(errors).some((k) => k.startsWith("googleNewsQueries")) && (
          <p className="text-xs text-destructive" role="alert">
            {Object.entries(errors).find(([k]) => k.startsWith("googleNewsQueries"))?.[1]}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {v.googleNewsQueries.map((q) => (
            <Chip key={q} label={q} onRemove={() => set("googleNewsQueries", v.googleNewsQueries.filter((x) => x !== q))}>
              <span className="max-w-[14rem] truncate">{q}</span>
            </Chip>
          ))}
          {v.googleNewsQueries.length === 0 && <p className="text-sm text-muted-foreground">Empty list means the defaults are used.</p>}
        </div>
        <Button type="button" variant="ghost" className="-ml-2 h-9" onClick={() => set("googleNewsQueries", defaultQueries)}>
          <RotateCcw aria-hidden /> Reset to defaults
        </Button>
      </Section>

      <Section
        id="gemini-links"
        icon={Sparkles}
        title="Your Gemini projects"
        description={
          <>
            Paste the link of the Gemini project or Gem you use for each subject. &quot;Ask Gemini&quot; buttons copy a ready-made prompt and open the matching one. A subject without a link uses &quot;Everything else&quot;, then Gemini&apos;s home page.
          </>
        }
        contentClassName="grid gap-4 sm:grid-cols-2"
      >
        <ExtensionStatus />
        {ASK_SUBJECTS.map((s) => (
          <Field key={s.id} id={`gemini-${s.id}`} label={s.label} error={err(`geminiLinks.${s.id}`)}>
            <Input
              id={`gemini-${s.id}`}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://gemini.google.com/gem/..."
              value={v.geminiLinks[s.id] ?? ""}
              onChange={(e) => set("geminiLinks", { ...v.geminiLinks, [s.id]: e.target.value })}
              {...aria(`geminiLinks.${s.id}`, `gemini-${s.id}`)}
            />
          </Field>
        ))}
      </Section>

      <Section
        id="paid-ai"
        icon={Wallet}
        title="Paid AI fallback"
        description="Only used after every free AI provider is out of quota, and never by background jobs. Each use asks first, unless you turn that off."
        contentClassName="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label htmlFor="llmPaidEnabled" className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5">
            <Checkbox id="llmPaidEnabled" checked={v.llmPaidEnabled} onCheckedChange={(c) => set("llmPaidEnabled", c === true)} className={CHECKBOX} />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Allow the paid fallback</span>
              <span className="block text-xs text-muted-foreground">Off means AI features stop when free quota runs out.</span>
            </span>
          </Label>
          <Label
            htmlFor="llmPaidRequireConfirm"
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5",
              !v.llmPaidEnabled && "cursor-not-allowed opacity-60",
            )}
          >
            <Checkbox
              id="llmPaidRequireConfirm"
              checked={v.llmPaidRequireConfirm}
              disabled={!v.llmPaidEnabled}
              onCheckedChange={(c) => set("llmPaidRequireConfirm", c === true)}
              className={CHECKBOX}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Ask before each use</span>
              <span className="block text-xs text-muted-foreground">Recommended. You confirm every paid call.</span>
            </span>
          </Label>
        </div>
        <Field id="llmPaidDailyCap" label="Paid calls per day (max)" hint="A call count, not a spend limit. 0–200." error={err("llmPaidDailyCap")}>
          <Input
            id="llmPaidDailyCap"
            type="number"
            inputMode="numeric"
            min={0}
            max={200}
            disabled={!v.llmPaidEnabled}
            value={v.llmPaidDailyCap}
            onChange={num("llmPaidDailyCap")}
            className="max-w-40"
            {...aria("llmPaidDailyCap")}
          />
        </Field>
      </Section>

      {(dirty || pending) && (
        <div
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg lg:bottom-4"
          role="region"
          aria-label="Unsaved changes"
        >
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              {pending ? (
                "Saving…"
              ) : errorCount > 0 ? (
                <span className="text-destructive">
                  {errorCount} field{errorCount === 1 ? " needs" : "s need"} fixing
                </span>
              ) : (
                <>
                  <span className="font-medium">Unsaved changes</span>
                  <span className="hidden text-muted-foreground sm:inline"> · {dirtySections.map((id) => SETTINGS_SECTION_LABEL[id]).join(", ")} · apply from tomorrow</span>
                </>
              )}
            </p>
            <Button type="button" variant="ghost" className="h-9" onClick={discard} disabled={pending}>
              Discard
            </Button>
            <Button type="submit" className="h-9" loading={pending}>
              {!pending && <Save aria-hidden />} {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
