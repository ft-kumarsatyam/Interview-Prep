import type { Metadata } from "next";
import Link from "next/link";
import { Award, CalendarCheck, Code2, ExternalLink, ListChecks, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CumulativeChart, DifficultyChart, MasteryRadar, QuizTrendChart, SolvesPerDayChart } from "@/components/stats/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStats } from "@/lib/services/stats";

export const metadata: Metadata = { title: "Stats" };

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="grid h-[220px] place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">{children}</p>;
}

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Code2; label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function CoverageList({ rows }: { rows: Array<{ key: string; label: string; done: number; total: number; pct: number }> }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1">
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {r.done}/{r.total} · {r.pct}%
            </span>
          </div>
          <Progress value={r.pct} aria-label={`${r.label}: ${r.pct}% done`} />
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  const s = await getStats();
  const hasSolves = s.totals.solved > 0;
  const lc = s.leetcode;

  return (
    <>
      <PageHeader title="Stats" description="Pace, difficulty mix, quiz trend, coverage and mastery." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile icon={Code2} label="Problems solved" value={String(s.totals.solved)} />
        <Tile icon={Target} label="Main track" value={`${s.totals.mainSolved}/${s.totals.mainTotal}`} hint={`${Math.round((100 * s.totals.mainSolved) / Math.max(1, s.totals.mainTotal))}% done`} />
        <Tile icon={CalendarCheck} label="Days complete" value={String(s.totals.daysComplete)} />
        <Tile icon={ListChecks} label="Quizzes passed" value={String(s.totals.quizzesPassed)} />
        <Tile icon={Award} label="Topics mastered" value={String(s.totals.mastered)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Problems per day</CardTitle>
            <CardDescription>Last 30 days, re-solves included.</CardDescription>
          </CardHeader>
          <CardContent>{hasSolves ? <SolvesPerDayChart data={s.perDay} /> : <Empty>Solve your first problem to start the chart.</Empty>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>On pace?</CardTitle>
            <CardDescription>Distinct main-track problems against the plan curve.</CardDescription>
          </CardHeader>
          <CardContent>{s.cumulative.length > 1 ? <CumulativeChart data={s.cumulative} /> : <Empty>The curve starts on the plan&apos;s first day.</Empty>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty mix</CardTitle>
            <CardDescription>New problems per plan week.</CardDescription>
          </CardHeader>
          <CardContent>{s.difficulty.some((w) => w.Easy + w.Medium + w.Hard > 0) ? <DifficultyChart data={s.difficulty} /> : <Empty>Nothing solved inside the plan window yet.</Empty>}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiz scores</CardTitle>
            <CardDescription>Best score per daily and weekly quiz.</CardDescription>
          </CardHeader>
          <CardContent>
            {s.quizzes.length > 0 ? (
              <QuizTrendChart data={s.quizzes} passPct={s.passPct} />
            ) : (
              <Empty>
                <span>
                  Take today&apos;s <Link href="/quiz" className="text-primary hover:underline">quiz</Link> to see your trend.
                </span>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JavaScript mastery</CardTitle>
            <CardDescription>Practice and topic-quiz scores per JS topic. Practise from any topic in Learn.</CardDescription>
          </CardHeader>
          <CardContent>
            {s.radar.some((r) => r.score > 0) ? (
              <MasteryRadar data={s.radar} />
            ) : (
              <p className="grid h-[280px] place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                <span>
                  Run a <Link href="/learn/practice?ref=js-basics:0" className="text-primary hover:underline">practice quiz</Link> to fill the radar.
                </span>
              </p>
            )}
            {s.radar.some((r) => r.mastered) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mastered: {s.radar.filter((r) => r.mastered).map((r) => r.title).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>LeetCode</CardTitle>
              <CardDescription>{lc.username ? `@${lc.username}, public profile` : "Not connected"}</CardDescription>
            </div>
            {lc.username && (
              <a href={`https://leetcode.com/u/${lc.username}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                Profile <ExternalLink className="size-3.5" />
              </a>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!lc.username ? (
              <p className="text-sm text-muted-foreground">
                <Link href="/settings" className="text-primary hover:underline">Add your username</Link> to see your totals and auto-tick solves.
              </p>
            ) : !lc.stats ? (
              <p className="text-sm text-muted-foreground">LeetCode didn&apos;t answer. Totals will show next time; syncing still works from the dashboard.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["Easy", "Medium", "Hard"] as const).map((d) => (
                    <div key={d} className="rounded-lg bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">{d}</p>
                      <p className="font-mono text-lg font-semibold tabular-nums">{lc.stats!.solved[d]}</p>
                      <p className="text-[11px] text-muted-foreground">of {lc.stats!.total[d]}</p>
                    </div>
                  ))}
                </div>
                <CoverageList
                  rows={[
                    { key: "lc", label: "All of LeetCode", done: lc.stats.solved.All, total: lc.stats.total.All, pct: Math.round((100 * lc.stats.solved.All) / Math.max(1, lc.stats.total.All)) },
                    { key: "prep", label: "PrepOS list (tracked here)", done: lc.trackedSolved, total: lc.trackedTotal, pct: Math.round((100 * lc.trackedSolved) / Math.max(1, lc.trackedTotal)) },
                  ]}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problem tracks</CardTitle>
            <CardDescription>Solved out of each list.</CardDescription>
          </CardHeader>
          <CardContent>
            <CoverageList rows={s.problemTracks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Syllabus coverage</CardTitle>
            <CardDescription>Subtopics ticked per track.</CardDescription>
          </CardHeader>
          <CardContent>
            <CoverageList rows={s.syllabusTracks} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
