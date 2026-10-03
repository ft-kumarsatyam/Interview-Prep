import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarRange, Check, Circle, Clock, Compass, History, Target } from "lucide-react";
import { FeasibilityCard } from "@/components/planner/intake-wizard";
import { PlannerForm } from "@/components/planner/planner-form";
import { ProposalCard } from "@/components/planner/proposal-card";
import { StudyTimer } from "@/components/planner/study-timer";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_HOURS } from "@/lib/domain/time-budget";
import { formatDate } from "@/lib/plan-clock";
import { topicById } from "@/lib/content";
import { loadPersonalisation } from "@/lib/services/intake-weights";
import { ensureToday } from "@/lib/services/plan";
import { getFeasibility } from "@/lib/services/planner-intake";
import { getIndicators, getSprintView } from "@/lib/services/planner";
import { proposeRebalance } from "@/lib/services/rebalance";
import { listPlanChanges } from "@/lib/services/plan-log";
import { listStudySessions } from "@/lib/services/study";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planner" };

const TONE = { good: "text-success", ok: "text-warning", low: "text-destructive", neutral: "text-foreground" } as const;
const BAR = { good: "[&>div]:bg-success", ok: "[&>div]:bg-warning", low: "[&>div]:bg-destructive", neutral: "" } as const;
const STATUS = {
  upcoming: ["Upcoming", "bg-muted text-muted-foreground"],
  active: ["This week", "bg-primary/12 text-primary"],
  completed: ["Completed", "bg-success/12 text-success"],
  behind: ["Missed items rolled forward", "bg-warning/12 text-warning"],
} as const;
const KIND_LABEL = { study: "Study", sunday: "Review", rest: "Rest", revision: "Revision", outside: "Outside plan" } as const;
const CHANGE_LABEL = { goals: "Goals", availability: "Availability", "rest-days": "Rest days", "plan-window": "Plan window", "replan-hours": "Re-plan", "carry-over": "Carried over", intake: "Intake", rebalance: "Rebalance" } as const;

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const { w } = await searchParams;
  const raw = Array.isArray(w) ? w[0] : w;
  const requested = raw && /^\d{1,3}$/.test(raw) ? Number(raw) : undefined;
  // One bootstrap per request, shared by everything below.
  const state = await ensureToday();
  const settings = state.settings;
  const personal = await loadPersonalisation();
  if (!personal.completed && !settings.plannerSetupAt) redirect("/plan/setup");
  const [sprint, indicators, changes, feasibility, proposal] = await Promise.all([
    getSprintView(requested, undefined, state),
    getIndicators(undefined, state),
    listPlanChanges(20),
    getFeasibility(),
    personal.completed ? proposeRebalance() : Promise.resolve(null),
  ]);
  const strengths = [...personal.weights.values()].sort((a, b) => a.strength - b.strength).slice(0, 12);
  const todaySessions = await listStudySessions(sprint.today, sprint.today);
  const { summary } = sprint;
  const [statusLabel, statusClass] = STATUS[summary.status];
  const todayMinutes = todaySessions.reduce((n, s) => n + s.minutes, 0);
  const hours = settings.hoursByDow?.length === 7 ? [...settings.hoursByDow] : [...DEFAULT_HOURS];

  return (
    <>
      <PageHeader icon={CalendarRange} title="Planner" description="Your goals, this week's sprint, the measures that matter, and a log of every change to the plan. Built around you." />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {proposal?.status === "pending" && <ProposalCard lines={proposal.lines} />}
          <Card>
            <CardHeader>
              <CardTitle>Will the plan fit?</CardTitle>
              <CardDescription>The work left against your hours until revision starts on {formatDate(feasibility.endDate, { day: "numeric", month: "short" })}.</CardDescription>
            </CardHeader>
            <CardContent>
              <FeasibilityCard f={feasibility} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>
                    Week {sprint.week} of {sprint.totalWeeks}
                    {sprint.phase && <span className="font-normal text-muted-foreground"> · {sprint.phase.name}</span>}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(sprint.from, { day: "numeric", month: "short" })} – {formatDate(sprint.to, { day: "numeric", month: "short" })}
                    {sprint.phase && ` · ${sprint.phase.outcome}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass)}>{statusLabel}</span>
                  <Link href={`/plan?w=${sprint.week - 1}`} aria-label="Previous week" aria-disabled={sprint.week <= 1} className={cn("grid size-8 place-items-center rounded-md hover:bg-muted", sprint.week <= 1 && "pointer-events-none opacity-40")}>
                    <ArrowLeft className="size-4" />
                  </Link>
                  <Link href={`/plan?w=${sprint.week + 1}`} aria-label="Next week" aria-disabled={sprint.week >= sprint.totalWeeks} className={cn("grid size-8 place-items-center rounded-md hover:bg-muted", sprint.week >= sprint.totalWeeks && "pointer-events-none opacity-40")}>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Target className="size-4 text-primary" aria-hidden /> Sprint objectives
                </h3>
                <ul className="space-y-1 text-sm">
                  <li>
                    {summary.dsaPlanned} DSA problems, {summary.theoryPlanned} theory subtopics, {summary.reviewsPlanned} spaced reviews and {summary.quizzesPlanned} quizzes
                    {summary.estMinutes > 0 && <span className="text-muted-foreground"> · about {Math.round(summary.estMinutes / 60)} h of work</span>}
                  </li>
                  {sprint.topics.length > 0 && (
                    <li className="flex flex-wrap gap-1.5 pt-1">
                      {sprint.topics.map((t) => (
                        <Link key={t.id} href={`/learn/${encodeURIComponent(t.id)}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:border-primary/50 hover:bg-primary/5">
                          {t.title} <span className="text-muted-foreground tabular-nums">{t.done}/{t.subtopics}</span>
                        </Link>
                      ))}
                    </li>
                  )}
                </ul>
              </div>

              {summary.completionRate !== null && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{summary.doneToDate} of {summary.plannedToDate} items due so far</span>
                    <span className="tabular-nums">{Math.round(summary.completionRate * 100)}%</span>
                  </div>
                  <Progress value={summary.completionRate * 100} className="h-1.5" aria-label="Sprint completion so far" />
                </div>
              )}

              <ol className="divide-y rounded-lg border text-sm">
                {sprint.days.map((d) => {
                  const work = d.kind === "study" || d.kind === "revision" || d.kind === "sunday";
                  const isToday = d.date === sprint.today;
                  return (
                    <li key={d.date}>
                      <Link href={`/calendar/${d.date}`} className={cn("flex items-center gap-3 px-3 py-2 hover:bg-muted/50", isToday && "bg-primary/5")}>
                        {d.complete ? <Check className="size-4 shrink-0 text-success" aria-label="Complete" /> : <Circle className={cn("size-4 shrink-0", d.date < sprint.today && work ? "text-warning" : "text-muted-foreground/50")} aria-label={d.date < sprint.today && work ? "Not complete" : "Open"} />}
                        <span className="w-24 shrink-0 font-medium">{formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                        <span className="w-20 shrink-0 text-muted-foreground">{KIND_LABEL[d.kind]}</span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground tabular-nums">
                          {work && d.kind !== "sunday" ? `DSA ${d.dsaSolved}/${d.dsaTarget} · theory ${d.theoryDone}/${d.theoryTarget} · quiz ${d.quizPassed ? "passed" : "open"}` : d.kind === "sunday" ? `weekly quiz ${d.quizPassed ? "passed" : "open"}` : ""}
                        </span>
                        {d.minutes > 0 && <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">{d.minutes} min</span>}
                        {d.source === "projected" && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">projected</span>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs text-muted-foreground">Projected days follow your real progress and can still change. A day&apos;s plan freezes when it begins; anything unfinished moves to the front of the next one.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress indicators</CardTitle>
              <CardDescription>Seven separate measures. A streak or a solve count alone doesn&apos;t mean you&apos;re interview-ready.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {indicators.map((i) => (
                <div key={i.id} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{i.label}</p>
                  <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", TONE[i.tone])}>{i.value}</p>
                  {i.frac !== null && <Progress value={i.frac * 100} className={cn("mt-1.5 h-1", BAR[i.tone])} aria-label={i.label} />}
                  <p className="mt-1.5 text-xs text-muted-foreground">{i.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Strengths and weak spots</CardTitle>
                <CardDescription>Your ratings blended with quiz and practice results. Weakest first; these get the most study time.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {strengths.map((w) => (
                    <li key={w.topicId} className="text-sm">
                      <div className="mb-1 flex justify-between gap-3">
                        <Link href={`/learn/${encodeURIComponent(w.topicId)}`} className="min-w-0 truncate hover:underline">{topicById.get(w.topicId)?.title ?? w.topicId}</Link>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{w.tier === "must" ? "" : `${w.tier} · `}{Math.round(w.strength)}%</span>
                      </div>
                      <Progress value={w.strength} className={cn("h-1.5", w.strength >= 70 ? BAR.good : w.strength >= 40 ? BAR.ok : BAR.low)} aria-label={`${topicById.get(w.topicId)?.title ?? w.topicId} strength`} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" aria-hidden /> Plan change log
              </CardTitle>
              <CardDescription>Every goal, hours, rest-day, re-plan and carry-over decision, with why. Nothing is rewritten silently.</CardDescription>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes yet. Entries appear when you edit goals or hours, re-plan a day, or a day closes with work left.</p>
              ) : (
                <ol className="space-y-2.5">
                  {changes.map((c) => (
                    <li key={c.id} className="flex gap-3 text-sm">
                      <span className="mt-0.5 h-fit shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{CHANGE_LABEL[c.type]}</span>
                      <div className="min-w-0">
                        <p className="text-pretty">{c.summary}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.date, { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="size-4" aria-hidden /> Plan setup
              </CardTitle>
              <CardDescription>{personal.completed ? "Your ratings, hours and goals drive the plan. Update them any time." : "Rate your strengths and weak spots so the plan fits you."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plan/setup" className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted">{personal.completed ? "Review my answers" : "Start the setup"}</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" aria-hidden /> Study timer
              </CardTitle>
              <CardDescription>Log real study time. It feeds the study-time and consistency measures.</CardDescription>
            </CardHeader>
            <CardContent>
              <StudyTimer sessions={todaySessions.map((s) => ({ id: s.id, minutes: s.minutes, kind: s.kind, note: s.note }))} todayMinutes={todayMinutes} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Goals &amp; availability</CardTitle>
            </CardHeader>
            <CardContent>
              <PlannerForm firstTime={!settings.plannerSetupAt} initial={{ ...settings.profile, endDate: settings.endDate, hoursByDow: hours }} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
