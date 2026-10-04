"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleHelp, Pencil, Plus, RotateCcw, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  completeIntakeAction,
  diagnosticCandidatesAction,
  feasibilityAction,
  saveIntakeStepAction,
  startDiagnosticAction,
  submitDiagnosticAction,
  type FeasibilityDto,
} from "@/app/(app)/plan/setup/actions";
import { Chip } from "@/components/shared/chip";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { DIAGNOSTIC_MAX_TOPICS, estimateMinutes, type DiagnosticVerdict } from "@/modules/progress/domain/diagnostic";
import { LEVELS, TIERS, type AvailabilityOverride, type IntakeStep, type Level, type Tier } from "@/modules/planner/domain/planner-intake";
import { weeklyHours } from "@/modules/planner/domain/planner-profile";
import type { DiagnosticCandidate, DiagnosticResult, DiagnosticTopic } from "@/modules/progress/services/diagnostic";
import { cn } from "@/core/utils";

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

const STEPS = [
  { label: "Goal", hint: "Role, level and date" },
  { label: "Strengths", hint: "Rate each topic" },
  { label: "Time", hint: "Hours you can give" },
  { label: "Check", hint: "Test your ratings" },
  { label: "Review", hint: "Does it fit?" },
] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const LEVEL_LABEL: Record<Level, string> = { fresher: "Fresher / student", "1-3y": "1 to 3 years", "3y+": "3+ years" };
const TIER_LABEL: Record<Tier, string> = { must: "Must cover", nice: "Nice to have", skip: "Skip" };
const RATING_HINT = ["", "Brand new", "Shaky", "Okay", "Comfortable", "Strong"] as const;
const HOUR_PRESETS: Array<{ label: string; hours: number[] }> = [
  { label: "Light: 1 h weekdays, 3 h weekends", hours: [3, 1, 1, 1, 1, 1, 3] },
  { label: "Steady: 2 h weekdays, 4 h weekends", hours: [4, 2, 2, 2, 2, 2, 4] },
  { label: "Intense: 4 h every day", hours: [4, 4, 4, 4, 4, 4, 4] },
];

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
  const [checked, setChecked] = useState(0);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const rated = Object.keys(ratings).length;
  const totalTopics = useMemo(() => tracks.reduce((n, t) => n + t.topics.length, 0), [tracks]);
  const weekly = weeklyHours(hours.map((h) => (h === "" || !Number.isFinite(Number(h)) ? 0 : Number(h))));

  const go = (next: number) => {
    setStep(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Saves the step first so a reload never loses it, then moves on. */
  function save(input: unknown, next: number) {
    start(async () => {
      const res = await saveIntakeStepAction(input);
      if (!res.ok) return void toast.error(res.error);
      go(next);
    });
  }

  const next = () => {
    if (step === 0) save({ step: "goals", ...goals, interviewDate: date }, 1);
    else if (step === 1)
      save({ step: "ratings", ratings: Object.entries(ratings).map(([topicId, r]) => ({ topicId, rating: r.rating, wantToLearn: r.wantToLearn, tier: r.tier })) }, 2);
    else if (step === 2) {
      if (hours.some((h) => h === "" || !Number.isFinite(Number(h)) || Number(h) < 0 || Number(h) > 12)) return void toast.error("Enter 0 to 12 hours for every day");
      save({ step: "availability", hoursByDow: hours.map(Number), overrides }, 3);
    } else go(step + 1);
  };

  const tiers = Object.values(ratings).reduce((n, r) => ({ ...n, [r.tier]: n[r.tier] + 1 }), { must: 0, nice: 0, skip: 0 } as Record<Tier, number>);

  return (
    <div ref={top} className="mx-auto max-w-3xl scroll-mt-20 space-y-5">
      <nav aria-label="Setup steps" className="space-y-2">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium transition-colors",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary bg-primary/10 text-primary",
                  i > step && "text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className={cn("block truncate text-sm", i === step ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
                <span className="block truncate text-2xs text-muted-foreground">{s.hint}</span>
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px min-w-4 flex-1", i < step ? "bg-primary" : "bg-border")} aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground md:hidden">
          Step {step + 1} of {STEPS.length} · <span className="font-medium text-foreground">{STEPS[step].label}</span> · {STEPS[step].hint}
        </p>
      </nav>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What are you preparing for?</CardTitle>
            <CardDescription>Your interview date sets how much time the plan has. Your level sets how fast it can safely move.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role">Target role</Label>
              <Input id="role" value={goals.targetRole} maxLength={80} placeholder="e.g. Backend engineer" onChange={(e) => setGoals({ ...goals, targetRole: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Target company (optional)</Label>
              <Input id="company" value={goals.targetCompany} maxLength={80} placeholder="e.g. Razorpay" onChange={(e) => setGoals({ ...goals, targetCompany: e.target.value })} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium">Your experience</legend>
              <div role="group" aria-label="Your experience" className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Chip key={l} pressed={goals.level === l} onClick={() => setGoals({ ...goals, level: l })}>
                    {LEVEL_LABEL[l]}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="date">Interview date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">No fixed date? Pick a realistic target. You can move it any time.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">What do you most want out of this? (optional)</Label>
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
              Be honest. Weak topics and the ones you want to learn get more time; strong ones get less. Topics you leave unrated are planned at the normal pace.
            </CardDescription>
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground tabular-nums">{rated}</span> of {totalTopics} topics rated
                </span>
                <span className="tabular-nums">
                  {tiers.must} must · {tiers.nice} nice · {tiers.skip} skip
                </span>
              </div>
              <Progress value={totalTopics ? (rated / totalTopics) * 100 : 0} className="h-1.5" aria-label="Topics rated" />
              <dl className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex gap-1">
                    <dt className="font-medium text-foreground tabular-nums">{n}</dt>
                    <dd>{RATING_HINT[n]}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRatings(Object.fromEntries(tracks.flatMap((t) => t.topics.map((x) => [x.id, ratings[x.id] ?? NEUTRAL]))))} disabled={rated === totalTopics}>
                  Rate the rest 3 (Okay)
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRatings({})} disabled={rated === 0}>
                  Clear all
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tracks.map((t, ti) => (
              <TrackRatings key={t.id} track={t} ratings={ratings} setRatings={setRatings} defaultOpen={ti === 0 || t.topics.some((x) => !ratings[x.id])} />
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>How much time can you give?</CardTitle>
            <CardDescription>
              Real, focused study hours per day: <span className="font-medium text-foreground tabular-nums">{weekly} h a week</span>. Full days off are set in Settings, and you can pause the plan from the Planner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick presets">
              {HOUR_PRESETS.map((p) => (
                <Chip key={p.label} pressed={hours.every((h, i) => Number(h) === p.hours[i])} onClick={() => setHours([...p.hours])}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {DAYS.map((d, i) => (
                <div key={d} className="space-y-1">
                  <Label htmlFor={`h-${i}`} className={cn("text-xs", i === 0 || i === 6 ? "text-foreground" : "text-muted-foreground")}>
                    {d}
                  </Label>
                  <div className="relative">
                    <Input id={`h-${i}`} inputMode="decimal" className="h-10 pr-6 text-center tabular-nums" value={String(hours[i] ?? "")} onChange={(e) => setHours(hours.map((h, j) => (j === i ? (e.target.value === "" ? "" : Number(e.target.value)) : h)))} />
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border p-3 sm:p-4">
              <div>
                <h3 className="text-sm font-semibold">Lighter or heavier periods</h3>
                <p className="text-xs text-muted-foreground">Exams, travel, a busy sprint at work: set different hours for a date range.</p>
              </div>
              {overrides.length === 0 && <p className="text-sm text-muted-foreground">None. The weekly pattern applies every week.</p>}
              {overrides.map((o, i) => (
                <div key={i} className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor={`of-${i}`}>From</Label>
                    <Input id={`of-${i}`} type="date" value={o.from} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground" htmlFor={`ot-${i}`}>To</Label>
                    <Input id={`ot-${i}`} type="date" value={o.to} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
                  </div>
                  <div className="space-y-1 sm:w-24">
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

      {step === 3 && (
        <DiagnosticStep
          onBack={() => go(1)}
          onDone={(n) => {
            setChecked((c) => c + n);
            go(4);
          }}
        />
      )}

      {step === 4 && (
        <ReviewStep
          alreadyDone={initial.completed}
          summary={[
            { label: "Goal", value: `${goals.targetRole || "No role"}${goals.targetCompany ? ` at ${goals.targetCompany}` : ""} · ${LEVEL_LABEL[goals.level]}`, step: 0 },
            { label: "Interview date", value: date || "Not set", step: 0 },
            { label: "Topics", value: `${rated} rated: ${tiers.must} must, ${tiers.nice} nice to have, ${tiers.skip} skipped`, step: 1 },
            { label: "Time", value: `${weekly} h a week${overrides.length ? `, ${overrides.length} special period${overrides.length === 1 ? "" : "s"}` : ""}`, step: 2 },
            { label: "Check", value: checked > 0 ? `${checked} topic${checked === 1 ? "" : "s"} checked this session` : "Skipped this time", step: 3 },
          ]}
          onEdit={go}
          interviewDate={date}
          weeklyHours={weekly}
          onFinish={() => router.push("/plan")}
        />
      )}

      {step !== 3 && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || pending}>
            <ArrowLeft /> Back
          </Button>
          {step < 4 && (
            <Button type="button" onClick={next} loading={pending}>
              {step === 2 ? "Save and continue" : "Save and next"} {!pending && <ArrowRight />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TrackRatings({
  track,
  ratings,
  setRatings,
  defaultOpen,
}: {
  track: WizardTrack;
  ratings: Record<string, RatingDraft>;
  setRatings: (r: Record<string, RatingDraft>) => void;
  defaultOpen: boolean;
}) {
  const ratedHere = track.topics.filter((x) => ratings[x.id]).length;
  const rateAll = (n: number) => setRatings({ ...ratings, ...Object.fromEntries(track.topics.map((x) => [x.id, { ...NEUTRAL, ...ratings[x.id], rating: n }])) });
  return (
    <details open={defaultOpen} className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{track.name}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {ratedHere} of {track.topics.length} rated
          </span>
        </span>
        <span className="flex items-center gap-2">
          {ratedHere === track.topics.length && <ToneBadge tone="success" icon={Check}>Done</ToneBadge>}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <div className="border-t">
        <div className="flex flex-wrap items-center gap-2 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Rate every topic here:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => rateAll(n)} title={RATING_HINT[n]} className="grid size-7 place-items-center rounded border bg-background tabular-nums hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {n}
            </button>
          ))}
        </div>
        <ul className="divide-y">
          {track.topics.map((x) => (
            <TopicRow key={x.id} topic={x} r={ratings[x.id]} onChange={(patch) => setRatings({ ...ratings, [x.id]: { ...NEUTRAL, ...ratings[x.id], ...patch } })} onClear={() => setRatings(Object.fromEntries(Object.entries(ratings).filter(([id]) => id !== x.id)))} />
          ))}
        </ul>
      </div>
    </details>
  );
}

function TopicRow({ topic, r, onChange, onClear }: { topic: WizardTrack["topics"][number]; r: RatingDraft | undefined; onChange: (p: Partial<RatingDraft>) => void; onClear: () => void }) {
  return (
    <li className={cn("space-y-2.5 p-3", r?.tier === "skip" && "bg-muted/30")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={cn("text-sm font-medium", r?.tier === "skip" && "text-muted-foreground line-through")}>{topic.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {r?.diagnosticScore != null && <ToneBadge tone={r.diagnosticScore >= 70 ? "success" : r.diagnosticScore >= 40 ? "warning" : "danger"}>Check {r.diagnosticScore}%</ToneBadge>}
          {topic.subtopics} subtopics
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="radiogroup" aria-label={`${topic.title}: how strong are you?`} className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={r?.rating === n}
              aria-label={`${n}, ${RATING_HINT[n]}`}
              title={RATING_HINT[n]}
              onClick={() => onChange({ rating: n })}
              className={cn(
                "grid size-9 place-items-center rounded-md border text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-10",
                r?.rating === n ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {n}
            </button>
          ))}
          <span className="ml-1 w-20 text-xs text-muted-foreground">{r ? RATING_HINT[r.rating] : "Not rated"}</span>
        </div>
        {r && (
          <div className="flex flex-wrap items-center gap-1.5">
            <div role="radiogroup" aria-label={`${topic.title} priority`} className="inline-flex rounded-md border p-0.5">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  role="radio"
                  aria-checked={r.tier === tier}
                  onClick={() => onChange({ tier, ...(tier === "skip" ? { wantToLearn: false } : {}) })}
                  className={cn("rounded px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", r.tier === tier ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {TIER_LABEL[tier]}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={r.wantToLearn}
              disabled={r.tier === "skip"}
              onClick={() => onChange({ wantToLearn: !r.wantToLearn })}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40",
                r.wantToLearn ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {r.wantToLearn && <Check className="size-3" aria-hidden />} Want to learn
              </span>
            </button>
            <button type="button" className="px-1 text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

const answerOf = (q: DiagnosticTopic["questions"][number], picked: number[]): number | null =>
  picked.length === 0 ? null : q.type === "multi" ? picked.reduce((m, i) => m | (1 << i), 0) : picked[0]!;

const VERDICT: Record<DiagnosticVerdict, { tone: "success" | "warning" | "info"; icon: typeof Check; label: string; copy: string }> = {
  "about-right": { tone: "success", icon: Check, label: "Matches your rating", copy: "Your rating looks right. Its study time stays as planned." },
  weaker: { tone: "warning", icon: TrendingDown, label: "Weaker than you rated", copy: "This topic will get more study time." },
  stronger: { tone: "info", icon: TrendingUp, label: "Stronger than you rated", copy: "This topic will get a little less time, freeing it for weaker ones." },
};

type Phase = { name: "loading" } | { name: "pick" } | { name: "quiz"; topics: DiagnosticTopic[]; index: number } | { name: "results"; results: DiagnosticResult[] };

function DiagnosticStep({ onBack, onDone }: { onBack: () => void; onDone: (checked: number) => void }) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [candidates, setCandidates] = useState<DiagnosticCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, number[]>>({});
  const [unsure, setUnsure] = useState<Record<string, boolean>>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const load = () =>
    start(async () => {
      const res = await diagnosticCandidatesAction();
      if (!res.ok) return void toast.error(res.error);
      const picked = new Set(res.suggested);
      setCandidates([...res.candidates.filter((c) => picked.has(c.topicId)), ...res.candidates.filter((c) => !picked.has(c.topicId))]);
      setSelected(res.suggested);
      setPhase({ name: "pick" });
    });

  useEffect(load, []);

  const chosenQuestions = candidates.filter((c) => selected.includes(c.topicId)).reduce((n, c) => n + Math.min(4, c.questions), 0);

  const begin = () =>
    start(async () => {
      const res = await startDiagnosticAction(selected);
      if (!res.ok) return void toast.error(res.error);
      if (res.topics.length === 0) return void toast.info("No check questions for these topics yet. Pick others or skip.");
      setPicked({});
      setUnsure({});
      setConfirmSubmit(false);
      setPhase({ name: "quiz", topics: res.topics, index: 0 });
    });

  const submit = (topics: DiagnosticTopic[]) =>
    start(async () => {
      const all = topics.flatMap((t) => t.questions);
      const res = await submitDiagnosticAction(all.map((q) => ({ id: q.id, answer: unsure[q.id] ? null : answerOf(q, picked[q.id] ?? []) })));
      if (!res.ok) return void toast.error(res.error);
      setCheckedCount((n) => n + res.results.length);
      setPhase({ name: "results", results: res.results });
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  const toggle = (q: DiagnosticTopic["questions"][number], i: number) => {
    setUnsure((u) => ({ ...u, [q.id]: false }));
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      return { ...p, [q.id]: q.type === "multi" ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i] };
    });
  };

  const header = (
    <CardHeader>
      <CardTitle>Quick check (optional)</CardTitle>
      <CardDescription>
        A few short questions per topic to test your ratings. If you don&apos;t know an answer, say so: an honest &quot;I don&apos;t know&quot; plans better than a lucky guess.
      </CardDescription>
    </CardHeader>
  );

  if (phase.name === "loading")
    return (
      <Card ref={top}>
        {header}
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading your topics…</p>
        </CardContent>
      </Card>
    );

  if (phase.name === "pick") {
    const checkable = candidates.filter((c) => c.questions > 0);
    return (
      <Card ref={top} className="scroll-mt-20">
        {header}
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm">
              <p>Rate a few topics first. The check only tests topics you&apos;ve rated.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft /> Rate topics
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDone(checkedCount)}>
                  Skip the check
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>
                  <span className="font-medium tabular-nums">{selected.length}</span> of {Math.min(DIAGNOSTIC_MAX_TOPICS, checkable.length)} topics picked
                  {selected.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {chosenQuestions} questions · about {estimateMinutes(chosenQuestions)} min
                    </span>
                  )}
                </p>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(checkable.slice(0, DIAGNOSTIC_MAX_TOPICS).map((c) => c.topicId))}>
                    Pick {Math.min(DIAGNOSTIC_MAX_TOPICS, checkable.length)}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])} disabled={selected.length === 0}>
                    None
                  </Button>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {candidates.map((c) => {
                  const on = selected.includes(c.topicId);
                  const full = !on && selected.length >= DIAGNOSTIC_MAX_TOPICS;
                  const disabled = c.questions === 0 || full;
                  return (
                    <li key={c.topicId}>
                      <label className={cn("flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors", on ? "border-primary/50 bg-primary/5" : "hover:bg-muted/40", disabled && "cursor-not-allowed opacity-50")}>
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-primary"
                          checked={on}
                          disabled={disabled}
                          onChange={() => setSelected(on ? selected.filter((x) => x !== c.topicId) : [...selected, c.topicId])}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{c.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            You rated {c.rating} ({RATING_HINT[c.rating]}) · {TIER_LABEL[c.tier].toLowerCase()}
                          </span>
                          {c.questions === 0 && <span className="block text-xs text-muted-foreground">No questions yet</span>}
                        </span>
                        {c.lastScore !== null && <ToneBadge tone={c.lastScore >= 70 ? "success" : c.lastScore >= 40 ? "warning" : "danger"}>Last {c.lastScore}%</ToneBadge>}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">Picked for you: topics you haven&apos;t checked yet, must-haves first, weakest first. Up to {DIAGNOSTIC_MAX_TOPICS} at a time.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={begin} loading={pending} disabled={selected.length === 0}>
                  Start the check {!pending && <ArrowRight />}
                </Button>
                <Button type="button" variant="ghost" onClick={() => onDone(checkedCount)} disabled={pending}>
                  Skip for now
                </Button>
              </div>
            </>
          )}
          <div className="border-t pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft /> Back to time
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase.name === "quiz") {
    const { topics, index } = phase;
    const topic = topics[index]!;
    const all = topics.flatMap((t) => t.questions);
    const isAnswered = (id: string) => unsure[id] || (picked[id]?.length ?? 0) > 0;
    const answered = all.filter((q) => isAnswered(q.id)).length;
    const blank = all.length - answered;
    const last = index === topics.length - 1;
    const goTo = (i: number) => {
      setConfirmSubmit(false);
      setPhase({ name: "quiz", topics, index: i });
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return (
      <Card ref={top} className="scroll-mt-20">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Topic {index + 1} of {topics.length}
            </span>
            <span className="tabular-nums">
              {answered}/{all.length} answered
            </span>
          </div>
          <Progress value={(answered / all.length) * 100} className="h-1.5" aria-label="Questions answered" />
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Topics in this check">
            {topics.map((t, i) => {
              const done = t.questions.every((q) => isAnswered(q.id));
              return (
                <button
                  key={t.topicId}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  onClick={() => goTo(i)}
                  className={cn(
                    "inline-flex max-w-44 items-center gap-1 truncate rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    i === index ? "border-primary bg-primary/10 font-medium text-primary" : done ? "border-success/40 text-success" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {done && i !== index && <Check className="size-3 shrink-0" aria-hidden />}
                  <span className="truncate">{t.title}</span>
                </button>
              );
            })}
          </div>
          <div>
            <CardTitle>{topic.title}</CardTitle>
            <CardDescription>
              You rated this {topic.rating} ({RATING_HINT[topic.rating]}). {topic.questions.length} question{topic.questions.length === 1 ? "" : "s"}, each from a different part of the topic.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topic.questions.map((q, qi) => {
            const mine = picked[q.id] ?? [];
            return (
              <fieldset key={q.id} className={cn("space-y-3 rounded-lg border p-3 sm:p-4", isAnswered(q.id) && "border-primary/30")}>
                <legend className="sr-only">Question {qi + 1}</legend>
                <div className="space-y-1">
                  <p className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                    Question {qi + 1}
                    {q.subtopic && <span className="normal-case"> · {q.subtopic}</span>}
                  </p>
                  <p className="text-sm font-medium text-pretty whitespace-pre-wrap">{q.prompt}</p>
                </div>
                {q.code && <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{q.code}</pre>}
                {q.type === "multi" && <p className="text-xs text-muted-foreground">Select all that apply.</p>}
                <div role={q.type === "multi" ? "group" : "radiogroup"} aria-label={`Question ${qi + 1} options`} className="grid gap-2">
                  {q.options.map((o, i) => {
                    const on = mine.includes(i) && !unsure[q.id];
                    return (
                      <button
                        key={i}
                        type="button"
                        role={q.type === "multi" ? "checkbox" : "radio"}
                        aria-checked={on}
                        onClick={() => toggle(q, i)}
                        className={cn(
                          "flex min-h-11 items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          on ? "border-primary bg-primary/10" : "hover:bg-muted/50",
                        )}
                      >
                        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center border text-2xs font-medium", q.type === "multi" ? "rounded" : "rounded-full", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>
                          {on ? <Check className="size-3" aria-hidden /> : String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre-wrap">{o}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={!!unsure[q.id]}
                    onClick={() => {
                      setUnsure((u) => ({ ...u, [q.id]: !u[q.id] }));
                      setPicked((p) => ({ ...p, [q.id]: [] }));
                    }}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      unsure[q.id] ? "border-warning/60 bg-warning/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <CircleHelp className="size-4 shrink-0" aria-hidden /> I don&apos;t know this yet
                  </button>
                </div>
              </fieldset>
            );
          })}

          {last && confirmSubmit && blank > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm" role="status">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              {blank} question{blank === 1 ? " has" : "s have"} no answer. They&apos;ll count as &quot;I don&apos;t know&quot;.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => (index === 0 ? setPhase({ name: "pick" }) : goTo(index - 1))} disabled={pending}>
              <ArrowLeft /> {index === 0 ? "Change topics" : "Previous topic"}
            </Button>
            {last ? (
              <Button type="button" loading={pending} onClick={() => (blank > 0 && !confirmSubmit ? setConfirmSubmit(true) : submit(topics))}>
                {blank > 0 && confirmSubmit ? "Submit anyway" : "See my results"}
              </Button>
            ) : (
              <Button type="button" onClick={() => goTo(index + 1)}>
                Next topic <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { results } = phase;
  const correct = results.reduce((n, r) => n + r.correct, 0);
  const total = results.reduce((n, r) => n + r.total, 0);
  const changed = results.filter((r) => r.verdict !== "about-right").length;
  return (
    <Card ref={top} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Your check results</CardTitle>
        <CardDescription>
          {correct} of {total} correct overall.{" "}
          {changed === 0 ? "Your ratings held up, so the plan keeps your time split." : `${changed} topic${changed === 1 ? "" : "s"} came out different from your rating; the plan adjusts their time.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-3">
          {results.map((r) => {
            const v = VERDICT[r.verdict];
            return (
              <li key={r.topicId} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.title}</span>
                  <ToneBadge tone={v.tone} icon={v.icon}>
                    {v.label}
                  </ToneBadge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={r.pct} className={cn("h-2 flex-1", r.pct >= 70 ? "[&>div]:bg-success" : r.pct >= 40 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive")} aria-label={`${r.title} score`} />
                  <span className="w-20 text-right text-sm tabular-nums">
                    {r.correct}/{r.total} · {r.pct}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You rated it {r.rating} ({RATING_HINT[r.rating]}). {v.copy}
                </p>
                {r.missed.length > 0 && (
                  <p className="text-xs">
                    <span className="font-medium">Study first:</span> <span className="text-muted-foreground">{r.missed.join(", ")}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">Scores are blended with your ratings and later practice, so one check never decides everything.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onDone(checkedCount)}>
            Continue to review <ArrowRight />
          </Button>
          <Button type="button" variant="outline" onClick={load} loading={pending}>
            <RotateCcw /> Check other topics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_COPY = {
  "on-track": ["On track", "text-success", "The time you have covers the work that's left."],
  tight: ["Tight", "text-warning", "It fits only if you stay consistent. Missed days will push you behind."],
  "at-risk": ["At risk", "text-destructive", "At this pace the work won't all fit before revision starts."],
} as const;

export function FeasibilityCard({ f, hideRemedies }: { f: FeasibilityDto; hideRemedies?: boolean }) {
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
      {!hideRemedies && f.remedies.length > 0 && (
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

function ReviewStep({
  alreadyDone,
  summary,
  onEdit,
  interviewDate,
  weeklyHours,
  onFinish,
}: {
  alreadyDone: boolean;
  summary: Array<{ label: string; value: string; step: number }>;
  onEdit: (step: number) => void;
  interviewDate: string;
  weeklyHours: number;
  onFinish: () => void;
}) {
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
        <CardTitle>Review your plan</CardTitle>
        <CardDescription>Check your answers and whether the time fits. Change anything and check again before you confirm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="divide-y rounded-lg border">
          {summary.map((s) => (
            <div key={s.label} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <dt className="w-28 shrink-0 text-muted-foreground">{s.label}</dt>
              <dd className="min-w-0 flex-1 text-pretty">{s.value}</dd>
              <button type="button" onClick={() => onEdit(s.step)} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-label={`Edit ${s.label.toLowerCase()}`}>
                <Pencil className="size-3" aria-hidden /> Edit
              </button>
            </div>
          ))}
        </dl>
        {error ? <p className="text-sm text-destructive">{error}</p> : f ? <FeasibilityCard f={f} /> : <p className="text-sm text-muted-foreground">Checking whether the plan fits…</p>}
        <p className="text-sm text-muted-foreground">
          Confirming sets your interview date to <span className="font-medium text-foreground">{interviewDate}</span> and your study time to{" "}
          <span className="font-medium text-foreground tabular-nums">{Math.round(weeklyHours * 10) / 10} h a week</span> for every future day. Today&apos;s plan and your other settings stay as they are.
        </p>
        <Button type="button" onClick={confirm} loading={pending} disabled={!f && !error} className="w-full sm:w-auto">
          {alreadyDone ? "Update my plan" : "Confirm and build my plan"}
        </Button>
      </CardContent>
    </Card>
  );
}
