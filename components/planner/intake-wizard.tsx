"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  completeIntakeAction,
  feasibilityAction,
  saveIntakeStepAction,
  startDiagnosticAction,
  submitDiagnosticAction,
  type FeasibilityDto,
} from "@/app/(app)/plan/setup/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LEVELS, TIERS, type AvailabilityOverride, type IntakeStep, type Level, type Tier } from "@/lib/domain/planner-intake";
import { weeklyHours } from "@/lib/domain/planner-profile";
import type { PublicQuestion } from "@/lib/quiz/question";
import { cn } from "@/lib/utils";

export interface WizardTrack {
  id: string;
  name: string;
  topics: Array<{ id: string; title: string; subtopics: number }>;
}

interface RatingDraft {
  rating: number;
  wantToLearn: boolean;
  tier: Tier;
  diagnosticScore: number | null;
}

export interface WizardInitial {
  goals: { targetRole: string; targetCompany: string; level: Level; focusNotes: string };
  interviewDate: string;
  ratings: Array<RatingDraft & { topicId: string }>;
  hoursByDow: number[];
  overrides: AvailabilityOverride[];
  stepsDone: IntakeStep[];
  completed: boolean;
}

const STEPS = ["Goal", "Strengths", "Time", "Check", "Review"] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const LEVEL_LABEL: Record<Level, string> = { fresher: "Fresher / student", "1-3y": "1 to 3 years", "3y+": "3+ years" };
const TIER_LABEL: Record<Tier, string> = { must: "Must cover", nice: "Nice to have", skip: "Skip" };
const RATING_HINT = ["", "Brand new", "Shaky", "Okay", "Comfortable", "Strong"] as const;
const SELECT = "h-9 rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

const NEUTRAL: RatingDraft = { rating: 3, wantToLearn: false, tier: "must", diagnosticScore: null };
const fmtHours = (min: number) => `${Math.round(min / 60)} h`;

export function IntakeWizard({ tracks, initial }: { tracks: WizardTrack[]; initial: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState(initial.goals);
  const [date, setDate] = useState(initial.interviewDate);
  const [ratings, setRatings] = useState<Record<string, RatingDraft>>(() => Object.fromEntries(initial.ratings.map(({ topicId, ...r }) => [topicId, r])));
  const [hours, setHours] = useState<Array<number | "">>(initial.hoursByDow);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>(initial.overrides);
  const [pending, start] = useTransition();

  const rated = Object.keys(ratings).length;
  const totalTopics = useMemo(() => tracks.reduce((n, t) => n + t.topics.length, 0), [tracks]);

  /** Saves the step first so a reload never loses it, then moves on. */
  function save(input: unknown, next: number) {
    start(async () => {
      const res = await saveIntakeStepAction(input);
      if (!res.ok) return void toast.error(res.error);
      setStep(next);
    });
  }

  const next = () => {
    if (step === 0) save({ step: "goals", ...goals, interviewDate: date }, 1);
    else if (step === 1)
      save({ step: "ratings", ratings: Object.entries(ratings).map(([topicId, r]) => ({ topicId, rating: r.rating, wantToLearn: r.wantToLearn, tier: r.tier })) }, 2);
    else if (step === 2) {
      if (hours.some((h) => h === "" || !Number.isFinite(Number(h)))) return void toast.error("Enter hours for every day (0 to 12)");
      save({ step: "availability", hoursByDow: hours.map(Number), overrides }, 3);
    } else setStep(step + 1);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ol className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm" aria-label="Setup steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium", i < step && "border-primary bg-primary text-primary-foreground", i === step && "border-primary text-primary")}>
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden truncate sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What are you preparing for?</CardTitle>
            <CardDescription>The date and your level set how much time there is and how fast the plan can safely go.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role">Target role</Label>
              <Input id="role" value={goals.targetRole} maxLength={80} onChange={(e) => setGoals({ ...goals, targetRole: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Target company (optional)</Label>
              <Input id="company" value={goals.targetCompany} maxLength={80} onChange={(e) => setGoals({ ...goals, targetCompany: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="level">Your experience</Label>
              <select id="level" className={cn(SELECT, "w-full")} value={goals.level} onChange={(e) => setGoals({ ...goals, level: e.target.value as Level })}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Interview date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">What do you most want to get out of this? (optional)</Label>
              <Input id="notes" value={goals.focusNotes} maxLength={300} placeholder="e.g. finally get comfortable with dynamic programming" onChange={(e) => setGoals({ ...goals, focusNotes: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Where are you strong or weak?</CardTitle>
            <CardDescription>
              Rate each topic from 1 (brand new) to 5 (strong). Weak and wanted topics get more time; strong ones less. Topics you leave unrated are planned as usual. {rated} of {totalTopics} rated.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setRatings(Object.fromEntries(tracks.flatMap((t) => t.topics.map((x) => [x.id, ratings[x.id] ?? NEUTRAL]))))}>
                Rate the rest 3
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setRatings({})} disabled={rated === 0}>
                Clear all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {tracks.map((t) => (
              <section key={t.id} aria-labelledby={`track-${t.id}`}>
                <h3 id={`track-${t.id}`} className="mb-2 text-sm font-semibold">
                  {t.name}
                </h3>
                <ul className="divide-y rounded-lg border">
                  {t.topics.map((x) => {
                    const r = ratings[x.id];
                    const set = (patch: Partial<RatingDraft>) => setRatings({ ...ratings, [x.id]: { ...NEUTRAL, ...r, ...patch } });
                    return (
                      <li key={x.id} className={cn("space-y-2 p-3", r?.tier === "skip" && "opacity-60")}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-medium">{x.title}</span>
                          <span className="text-xs text-muted-foreground">{x.subtopics} subtopics</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div role="group" aria-label={`${x.title} rating`} className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" aria-pressed={r?.rating === n} title={RATING_HINT[n]} onClick={() => set({ rating: n })} className={cn("grid size-9 place-items-center rounded-md border text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", r?.rating === n ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
                                {n}
                              </button>
                            ))}
                          </div>
                          {r && (
                            <>
                              <select aria-label={`${x.title} priority`} className={SELECT} value={r.tier} onChange={(e) => set({ tier: e.target.value as Tier })}>
                                {TIERS.map((tier) => (
                                  <option key={tier} value={tier}>
                                    {TIER_LABEL[tier]}
                                  </option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1.5 text-sm">
                                <input type="checkbox" checked={r.wantToLearn} onChange={(e) => set({ wantToLearn: e.target.checked })} disabled={r.tier === "skip"} />I want to learn this
                              </label>
                              <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setRatings(Object.fromEntries(Object.entries(ratings).filter(([id]) => id !== x.id)))}>
                                clear
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>How much time can you give?</CardTitle>
            <CardDescription>
              Hours of real study per day, {weeklyHours(hours.map((h) => (h === "" ? 0 : Number(h)))) || 0} h a week. Add a range if some weeks are lighter (exams, travel). Full days off are set in Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((d, i) => (
                <div key={d} className="space-y-1">
                  <Label htmlFor={`h-${i}`} className="text-xs text-muted-foreground">
                    {d}
                  </Label>
                  <Input id={`h-${i}`} inputMode="decimal" className="h-9 px-2 text-center" value={String(hours[i] ?? "")} onChange={(e) => setHours(hours.map((h, j) => (j === i ? (e.target.value === "" ? "" : Number(e.target.value)) : h)))} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Lighter or heavier periods</h3>
              {overrides.length === 0 && <p className="text-sm text-muted-foreground">None. The weekly pattern applies every week.</p>}
              {overrides.map((o, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor={`of-${i}`}>From</Label>
                    <Input id={`of-${i}`} type="date" value={o.from} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor={`ot-${i}`}>To</Label>
                    <Input id={`ot-${i}`} type="date" value={o.to} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor={`oh-${i}`}>Hours/day</Label>
                    <Input id={`oh-${i}`} inputMode="decimal" value={String(o.hours)} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, hours: Number(e.target.value) } : x)))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove range" onClick={() => setOverrides(overrides.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={overrides.length >= 20} onClick={() => setOverrides([...overrides, { from: date || "", to: date || "", hours: 2 }])}>
                <Plus /> Add a range
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && <DiagnosticStep ratedCount={rated} onDone={() => setStep(4)} />}

      {step === 4 && <ReviewStep alreadyDone={initial.completed} onFinish={() => router.push("/plan")} />}

      {step !== 3 && (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || pending}>
            <ArrowLeft /> Back
          </Button>
          {step < 4 && (
            <Button type="button" onClick={next} loading={pending}>
              {step === 2 ? "Save and continue" : "Next"} {!pending && <ArrowRight />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const answerOf = (q: PublicQuestion, picked: number[]): number | null => (picked.length === 0 ? null : q.type === "multi" ? picked.reduce((m, i) => m | (1 << i), 0) : picked[0]!);

function DiagnosticStep({ ratedCount, onDone }: { ratedCount: number; onDone: () => void }) {
  const [topics, setTopics] = useState<Array<{ topicId: string; title: string; questions: PublicQuestion[] }> | null>(null);
  const [picked, setPicked] = useState<Record<string, number[]>>({});
  const [results, setResults] = useState<Array<{ topicId: string; title: string; correct: number; total: number; pct: number }> | null>(null);
  const [pending, start] = useTransition();

  const begin = () =>
    start(async () => {
      const res = await startDiagnosticAction();
      if (!res.ok) return void toast.error(res.error);
      if (res.topics.length === 0) {
        toast.info("No check questions for your topics yet. Moving on.");
        return onDone();
      }
      setTopics(res.topics);
    });

  const submit = () =>
    start(async () => {
      const all = topics!.flatMap((t) => t.questions);
      const res = await submitDiagnosticAction(all.map((q) => ({ id: q.id, answer: answerOf(q, picked[q.id] ?? []) })));
      if (!res.ok) return void toast.error(res.error);
      setResults(res.results);
    });

  const toggle = (q: PublicQuestion, i: number) => setPicked((p) => ({ ...p, [q.id]: q.type === "multi" ? ((p[q.id] ?? []).includes(i) ? (p[q.id] ?? []).filter((x) => x !== i) : [...(p[q.id] ?? []), i]) : [i] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick check (optional)</CardTitle>
        <CardDescription>A few questions per topic test your ratings. Honest answers beat lucky guesses: leave a question blank if you don&apos;t know it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {results ? (
          <>
            <ul className="divide-y rounded-lg border text-sm">
              {results.map((r) => (
                <li key={r.topicId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">{r.title}</span>
                  <span className={cn("tabular-nums", r.pct >= 70 ? "text-success" : r.pct >= 40 ? "text-warning" : "text-destructive")}>{r.correct}/{r.total}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">These scores now count towards how much time each topic gets, alongside your ratings.</p>
            <Button type="button" onClick={onDone}>Continue <ArrowRight /></Button>
          </>
        ) : topics ? (
          <>
            {topics.map((t) => (
              <section key={t.topicId} className="space-y-3">
                <h3 className="text-sm font-semibold">{t.title}</h3>
                {t.questions.map((q) => (
                  <fieldset key={q.id} className="space-y-2 rounded-lg border p-3">
                    <legend className="px-1 text-sm">{q.prompt}</legend>
                    {q.code && <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{q.code}</pre>}
                    {q.type === "multi" && <p className="text-xs text-muted-foreground">Select all that apply.</p>}
                    {q.options.map((o, i) => (
                      <label key={i} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input type={q.type === "multi" ? "checkbox" : "radio"} name={q.id} className="mt-1" checked={(picked[q.id] ?? []).includes(i)} onChange={() => toggle(q, i)} />
                        <span className="whitespace-pre-wrap">{o}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </section>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={submit} loading={pending}>Submit answers</Button>
              <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Skip the check</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={begin} loading={pending} disabled={ratedCount === 0}>Start the check</Button>
            <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Skip</Button>
            {ratedCount === 0 && <p className="w-full text-xs text-muted-foreground">Rate some topics first (go back one step) to get a check.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COPY = {
  "on-track": ["On track", "text-success", "The time you have covers the work that's left."],
  tight: ["Tight", "text-warning", "It fits only if you stay consistent. Any missed days will push you behind."],
  "at-risk": ["At risk", "text-destructive", "At this pace the work won't all fit before revision starts."],
} as const;

export function FeasibilityCard({ f }: { f: FeasibilityDto }) {
  const [label, tone, copy] = STATUS_COPY[f.status];
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={cn("flex items-center gap-1.5 font-semibold", tone)}>
          {f.status === "on-track" ? <CheckCircle2 className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />} {label}
        </p>
        <p className="text-sm tabular-nums">{Math.round(f.coverage * 100)}% covered</p>
      </div>
      <Progress value={f.coverage * 100} className="h-1.5" aria-label="Share of the work your time covers" />
      <p className="text-sm text-muted-foreground">{copy}</p>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div><dt className="text-xs text-muted-foreground">Work left</dt><dd className="font-medium tabular-nums">{fmtHours(f.requiredMin)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Time before revision</dt><dd className="font-medium tabular-nums">{fmtHours(f.availableMin)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Must-have covered</dt><dd className="font-medium tabular-nums">{Math.round(f.mustCoverage * 100)}%</dd></div>
      </dl>
      {f.remedies.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">To close the {fmtHours(f.gapMin)} gap, any of these works:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {f.remedies.map((r) => (
              <li key={r.kind}>
                {r.kind === "drop-nice" && `Drop the nice-to-have topics (${r.subtopics} subtopics, about ${fmtHours(r.minutes)})${r.resolves ? "" : ", which helps but isn't enough alone"}.`}
                {r.kind === "add-hours" && `Study about ${r.hoursPerWeek} more hours a week.`}
                {r.kind === "extend-date" && `Move the interview date about ${r.weeks} week${r.weeks === 1 ? "" : "s"} later.`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ alreadyDone, onFinish }: { alreadyDone: boolean; onFinish: () => void }) {
  const [f, setF] = useState<FeasibilityDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    feasibilityAction(true).then((res) => {
      if (!live) return;
      if (res.ok) setF(res.feasibility);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const confirm = () =>
    start(async () => {
      const res = await completeIntakeAction();
      if (!res.ok) return void toast.error(res.error);
      toast.success(alreadyDone ? "Plan updated." : "Your plan is set.");
      onFinish();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Does your plan fit?</CardTitle>
        <CardDescription>Checked against your real progress, your ratings and the hours you gave. You can change any answer and check again.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : f ? <FeasibilityCard f={f} /> : <p className="text-sm text-muted-foreground">Checking…</p>}
        <p className="text-xs text-muted-foreground">Confirming applies your hours and interview date to every future day. Today&apos;s plan stays as it is.</p>
        <Button type="button" onClick={confirm} loading={pending} disabled={!f && !error}>
          {alreadyDone ? "Update my plan" : "Confirm and build my plan"}
        </Button>
      </CardContent>
    </Card>
  );
}
