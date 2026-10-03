import type { Metadata } from "next";
import Link from "next/link";
import { Award, BarChart3, BookOpen, CalendarCheck, Code2, ExternalLink, Flame, ListChecks, Radar as RadarIcon, Settings, Target, TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { ToneBadge } from "@/components/shared/tone-badge";
import { CumulativeChart, DifficultyChart, MasteryRadar, QuizTrendChart, SolvesPerDayChart } from "@/components/stats/charts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ensureToday } from "@/lib/services/plan";
import { getStats } from "@/lib/services/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stats" };

const pctOf = (done: number, total: number) => Math.round((100 * done) / Math.max(1, total));

function ChartCard({ title, description, action, children, className }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <SectionHeading eyebrow className="mb-0" title={title} />
      {children}
    </section>
  );
}

function CoverageList({ rows }: { rows: Array<{ key: string; label: string; done: number; total: number; pct: number }> }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1.5">
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {r.done}/{r.total} · <span className={cn(r.pct === 100 && "text-success")}>{r.pct}%</span>
            </span>
          </div>
          <Progress value={r.pct} aria-label={`${r.label}: ${r.pct}% done`} />
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  const [s, t] = await Promise.all([getStats(), ensureToday()]);
  const hasSolves = s.totals.solved > 0;
  const lc = s.leetcode;
  const mainPct = pctOf(s.totals.mainSolved, s.totals.mainTotal);
  const last30 = s.perDay.reduce((n, d) => n + d.count, 0);
  const pace = s.cumulative.at(-1);
  const gap = pace ? pace.actual - pace.ideal : 0;
  const quizAvg = s.quizzes.length ? Math.round(s.quizzes.reduce((n, q) => n + q.pct, 0) / s.quizzes.length) : null;
  const mastered = s.radar.filter((r) => r.mastered);

  return (
    <>
      <PageHeader title="Stats" icon={BarChart3} description="Are you on pace? Solves, quiz trend, coverage and mastery in one place." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Flame} tone="streak" label="Streak" value={`${t.streak}d`} hint={`Best ${t.best}d`} />
        <StatTile icon={Code2} label="Problems solved" value={String(s.totals.solved)} hint={`${last30} in the last 30 days`} />
        <StatTile icon={Target} label="Main track" value={`${mainPct}%`} hint={`${s.totals.mainSolved} of ${s.totals.mainTotal}`}>
          <Progress value={mainPct} className="mt-1" aria-label={`Main track ${mainPct}% done`} />
        </StatTile>
        <StatTile icon={CalendarCheck} tone="success" label="Days complete" value={String(s.totals.daysComplete)} />
        <StatTile icon={ListChecks} label="Quizzes passed" value={String(s.totals.quizzesPassed)} hint={quizAvg === null ? "No quizzes yet" : `Avg best ${quizAvg}%`} />
        <StatTile icon={Award} tone="warning" label="Topics mastered" value={String(s.totals.mastered)} />
      </div>

      <Section title="Practice pace">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="On pace?"
            description="Distinct main-track problems against the plan curve."
            action={
              pace && s.cumulative.length > 1 ? (
                <ToneBadge tone={gap >= 0 ? "success" : "danger"} icon={gap >= 0 ? TrendingUp : TrendingDown}>
                  {gap === 0 ? "On pace" : gap > 0 ? `${gap} ahead` : `${-gap} behind`}
                </ToneBadge>
              ) : undefined
            }
          >
            {s.cumulative.length > 1 ? (
              <CumulativeChart data={s.cumulative} />
            ) : (
              <EmptyState compact icon={TrendingUp} title="Not started yet">
                The curve starts on the plan&apos;s first day.
              </EmptyState>
            )}
          </ChartCard>

          <ChartCard
            title="Problems per day"
            description="Last 30 days, re-solves included."
            action={hasSolves ? <span className="font-mono text-xs text-muted-foreground tabular-nums">{last30} total</span> : undefined}
          >
            {hasSolves ? (
              <SolvesPerDayChart data={s.perDay} />
            ) : (
              <EmptyState
                compact
                icon={Code2}
                title="No solves yet"
                action={
                  <Button asChild size="lg" className="h-10 px-4">
                    <Link href="/dashboard">Today&apos;s problems</Link>
                  </Button>
                }
              >
                Solve your first problem to start the chart.
              </EmptyState>
            )}
          </ChartCard>

          <ChartCard title="Difficulty mix" description="New problems per plan week." className="lg:col-span-2">
            {s.difficulty.some((w) => w.Easy + w.Medium + w.Hard > 0) ? (
              <DifficultyChart data={s.difficulty} />
            ) : (
              <EmptyState compact icon={BarChart3} title="Nothing in the plan window yet">
                Weekly difficulty bars appear once you solve inside the plan.
              </EmptyState>
            )}
          </ChartCard>
        </div>
      </Section>

      <Section title="Quizzes & mastery">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Quiz scores"
            description={`Best score per daily and weekly quiz. Dots are green when ≥ ${s.passPct}%.`}
            action={
              s.quizzes.length > 0 ? (
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <Link href="/quiz/history">History</Link>
                </Button>
              ) : undefined
            }
          >
            {s.quizzes.length > 0 ? (
              <QuizTrendChart data={s.quizzes} passPct={s.passPct} />
            ) : (
              <EmptyState
                compact
                icon={ListChecks}
                title="No quiz scores yet"
                action={
                  <Button asChild size="lg" className="h-10 px-4">
                    <Link href="/quiz">Go to today&apos;s quiz</Link>
                  </Button>
                }
              >
                Take today&apos;s quiz to see your trend.
              </EmptyState>
            )}
          </ChartCard>

          <ChartCard title="JavaScript mastery" description="Practice and topic-quiz scores per JS topic.">
            {s.radar.some((r) => r.score > 0) ? (
              <>
                <MasteryRadar data={s.radar} />
                {mastered.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="sr-only">Mastered:</span>
                    {mastered.map((r) => (
                      <ToneBadge key={r.title} tone="success" icon={Award}>
                        {r.title}
                      </ToneBadge>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                compact
                icon={RadarIcon}
                title="Radar is empty"
                action={
                  <Button asChild size="lg" className="h-10 px-4">
                    <Link href="/learn/practice?ref=js-basics:0">
                      <BookOpen /> Run a practice quiz
                    </Link>
                  </Button>
                }
              >
                Practise from any JS topic in Learn to fill it in.
              </EmptyState>
            )}
          </ChartCard>
        </div>
      </Section>

      <Section title="Coverage">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChartCard title="Problem tracks" description="Solved out of each list.">
            <CoverageList rows={s.problemTracks} />
          </ChartCard>

          <ChartCard title="Syllabus coverage" description="Subtopics ticked per track.">
            <CoverageList rows={s.syllabusTracks} />
          </ChartCard>

          <ChartCard
            title="LeetCode"
            description={lc.username ? `@${lc.username}, public profile` : "Not connected"}
            action={
              lc.username ? (
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <a href={`https://leetcode.com/u/${lc.username}/`} target="_blank" rel="noopener noreferrer">
                    Profile <ExternalLink />
                  </a>
                </Button>
              ) : undefined
            }
          >
            {!lc.username ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Add your username to see your totals and auto-tick solves.</p>
                <Button asChild variant="outline" size="lg" className="h-10 px-4">
                  <Link href="/settings">
                    <Settings /> Open settings
                  </Link>
                </Button>
              </div>
            ) : !lc.stats ? (
              <p className="text-sm text-muted-foreground">LeetCode didn&apos;t answer. Totals will show next time; syncing still works from the dashboard.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["Easy", "text-success"],
                      ["Medium", "text-warning"],
                      ["Hard", "text-destructive"],
                    ] as const
                  ).map(([d, tone]) => (
                    <div key={d} className="rounded-lg bg-muted/50 p-2">
                      <p className={cn("text-xs font-medium", tone)}>{d}</p>
                      <p className="font-mono text-lg font-semibold tabular-nums">{lc.stats!.solved[d]}</p>
                      <p className="text-2xs text-muted-foreground">of {lc.stats!.total[d]}</p>
                    </div>
                  ))}
                </div>
                <CoverageList
                  rows={[
                    { key: "lc", label: "All of LeetCode", done: lc.stats.solved.All, total: lc.stats.total.All, pct: pctOf(lc.stats.solved.All, lc.stats.total.All) },
                    { key: "prep", label: "PrepOS list (tracked here)", done: lc.trackedSolved, total: lc.trackedTotal, pct: pctOf(lc.trackedSolved, lc.trackedTotal) },
                  ]}
                />
              </div>
            )}
          </ChartCard>
        </div>
      </Section>
    </>
  );
}
