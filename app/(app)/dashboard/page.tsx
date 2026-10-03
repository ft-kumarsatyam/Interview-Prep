import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  Code2,
  Flame,
  Lock,
  ListChecks,
  Newspaper,
  PartyPopper,
  Snowflake,
  TrendingDown,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { currentSession } from "@/lib/auth/dal";
import { getSetupChecklist } from "@/lib/services/setup";
import { Heatmap } from "@/components/dashboard/heatmap";
import { HoursToday } from "@/components/dashboard/hours-today";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { ProblemList } from "@/components/progress/problem-list";
import { SubtopicChecklist } from "@/components/progress/subtopic-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toCardItem } from "@/components/news/card-item";
import { NewsCard } from "@/components/news/news-card";
import { mainProblemCount } from "@/lib/content";
import { isLongRead } from "@/lib/domain/article";
import { READINGS_PER_DAY } from "@/lib/domain/plan-config";
import { listArticles } from "@/lib/services/news";
import { formatDate, planClock } from "@/lib/plan-clock";
import { getDashboard, type PlanProblem } from "@/lib/services/dashboard";
import { syncLeetCode } from "@/lib/services/leetcode-sync";
import { LeetCodeCard } from "@/components/leetcode/leetcode-card";
import { WeeklyMocksCard } from "@/components/mock/weekly-mocks-card";
import { weeklyMocks } from "@/lib/services/mock";
import { getPlanUpdate } from "@/lib/services/recap";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function localHour(timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
}

const toItem = (p: PlanProblem, tag?: string) => ({
  slug: p.slug,
  title: p.title,
  difficulty: p.difficulty,
  pattern: p.pattern,
  url: p.url,
  solved: p.solvedToday,
  tag,
});

interface Requirement {
  label: string;
  value: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
  /** 0–1, drives the mini progress bar; omitted for pass/fail rows. */
  frac?: number;
  hint?: string;
  /** Call to action when this is the next thing to do. */
  cta: string;
}

export default async function DashboardPage() {
  // Throttled to once per 10 min; a LeetCode outage must never break the dashboard.
  await syncLeetCode().catch(() => null);
  const session = await currentSession();
  const [data, unreadNews, setup] = await Promise.all([
    getDashboard(),
    listArticles({ filter: "unread", limit: 30 }),
    getSetupChecklist({ remember: session.remember }),
  ]);
  const latestNews = [...unreadNews.filter((a) => isLongRead(a)), ...unreadNews.filter((a) => !isLongRead(a))].slice(0, 3);
  const { day, plan, settings, today } = data;
  const [mockSlots, planUpdate] = await Promise.all([weeklyMocks(today, settings.mockSchedule), getPlanUpdate(today, settings, data.pace.solved)]);
  const clock = planClock(settings);
  const hour = localHour(settings.timezone);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const workday = day.kind === "study" || day.kind === "revision";
  const atRisk = !day.complete && workday && hour >= 20;

  const requirements: Requirement[] = workday
    ? [
        {
          label: "DSA",
          value: `${day.dsaSolved}/${day.dsaTarget}`,
          done: day.dsaSolved >= day.dsaTarget,
          frac: day.dsaTarget ? day.dsaSolved / day.dsaTarget : 1,
          href: "#problems",
          icon: Code2,
          cta: "Solve the next problem",
        },
        {
          label: "Theory",
          value: `${day.theoryDone}/${day.theoryTarget}`,
          done: day.theoryDone >= day.theoryTarget,
          frac: day.theoryTarget ? day.theoryDone / day.theoryTarget : 1,
          href: "#theory",
          icon: BookOpen,
          cta: "Study today's theory",
        },
        {
          label: "Daily quiz",
          value: day.quizPassed ? "passed" : day.quizUnlocked ? "ready" : "locked",
          done: day.quizPassed,
          href: "/quiz",
          icon: day.quizUnlocked || day.quizPassed ? ListChecks : Lock,
          hint: !day.quizUnlocked && !day.quizPassed ? "Unlocks after 1 problem + 1 subtopic" : undefined,
          cta: "Take the daily quiz",
        },
        {
          label: "Read (bonus)",
          value: `${day.readings}/${READINGS_PER_DAY}`,
          done: day.readings >= READINGS_PER_DAY,
          frac: day.readings / READINGS_PER_DAY,
          href: "/news",
          icon: Newspaper,
          cta: "Read an article",
        },
      ]
    : day.kind === "sunday"
      ? [
          {
            label: "Weekly quiz",
            value: day.quizPassed ? "passed" : "open",
            done: day.quizPassed,
            href: "/quiz",
            icon: ListChecks,
            cta: "Take the weekly quiz",
          },
        ]
      : [];
  const doneCount = requirements.filter((r) => r.done).length;
  // The quiz only becomes "next" once it can actually be taken.
  const next = requirements.find((r) => !r.done && !(r.href === "/quiz" && workday && !day.quizUnlocked));

  const newProblems = data.problems.filter((p) => p.role === "new");
  const reviews = data.problems.filter((p) => p.role === "review");
  const sideTrack = data.problems.filter((p) => p.role === "js" || p.role === "sql");
  const showLeetCode = !settings.leetcodeUsername || data.needsDetails.length > 0;
  const lastSyncLabel = settings.leetcodeLastSyncAt
    ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: settings.timezone }).format(
        settings.leetcodeLastSyncAt,
      )
    : null;
  const weekFrac = clock.totalWeeks ? Math.min(Math.max(clock.week, 0) / clock.totalWeeks, 1) : 0;

  const dayCopy =
    day.kind === "outside"
      ? "Outside the plan window. Warm up with anything below."
      : day.kind === "rest"
        ? "Rest day: counts as complete. Recharge."
        : day.kind === "sunday"
          ? data.bonus.problems.length + data.bonus.theory.length > 0
            ? "Sunday: reviews + the weekly quiz. Spare hours are below as optional extras."
            : "Sunday: reviews + the weekly quiz."
          : day.kind === "revision"
            ? "Revision phase: timed problems and reviews."
            : "Hit every target and pass the quiz to keep the streak.";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting}, {process.env.ADMIN_NAME || "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {clock.week === 0
              ? `Plan starts in ${clock.daysUntilStart} day${clock.daysUntilStart === 1 ? "" : "s"}`
              : `Week ${clock.week} of ${clock.totalWeeks} · ${clock.phase?.name}`}
          </p>
        </div>
        {next ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={next.href}>
              <next.icon /> {next.cta} <ArrowRight />
            </Link>
          </Button>
        ) : day.complete ? (
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success sm:self-auto">
            <PartyPopper className="size-4" /> Day complete. Nice work!
          </p>
        ) : null}
      </div>

      {(planUpdate.carryOver || planUpdate.forecast) && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm" aria-label="Plan update">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <CalendarClock className="size-4 text-warning" aria-hidden /> Plan update
          </p>
          <ul className="space-y-1 text-muted-foreground">
            {planUpdate.carryOver && <li>{planUpdate.carryOver}</li>}
            {planUpdate.forecast && <li>{planUpdate.forecast}</li>}
          </ul>
        </div>
      )}

      {setup.requiredLeft > 0 && (
        <Link
          href="/setup"
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent/50"
        >
          <Wrench className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Finish setup: {setup.done}/{setup.total}</span>{" "}
            <span className="text-muted-foreground">
              {setup.items
                .filter((i) => i.required && i.status !== "ok")
                .map((i) => i.title)
                .join(" · ")}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}

      {data.unreadNotifications.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm" role="status">
          <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{data.unreadNotifications[0].title}</p>
            {data.unreadNotifications[0].body && <p className="text-muted-foreground">{data.unreadNotifications[0].body}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className={cn(day.complete && "border-success/40")}>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>{dayCopy}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <ProgressRing done={doneCount} total={requirements.length} complete={day.complete} />
            <div className="w-full min-w-0 space-y-3">
              <ul className="w-full space-y-2">
                {requirements.map((r) => {
                  const isNext = r === next;
                  return (
                    <li key={r.label}>
                      <Link
                        href={r.href}
                        className={cn(
                          "group flex flex-col gap-1.5 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted",
                          isNext && "border-primary/50 bg-primary/5",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          {r.done ? (
                            <Check className="size-4 shrink-0 text-success" aria-hidden />
                          ) : (
                            <r.icon className={cn("size-4 shrink-0", isNext ? "text-primary" : "text-muted-foreground")} aria-hidden />
                          )}
                          <span className={cn("flex-1", r.done && "text-muted-foreground line-through")}>{r.label}</span>
                          {isNext && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">next</span>}
                          <span className="tabular font-mono text-xs">{r.value}</span>
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                        {r.frac !== undefined && !r.done && (
                          <Progress value={Math.min(r.frac, 1) * 100} className="h-1" aria-hidden />
                        )}
                        {r.hint && <span className="pl-7 text-xs text-muted-foreground">{r.hint}</span>}
                      </Link>
                    </li>
                  );
                })}
                {requirements.length === 0 && <li className="text-sm text-muted-foreground">No targets today.</li>}
              </ul>
              {(workday || day.kind === "sunday") && <HoursToday hours={plan.hours ?? null} estMinutes={plan.estMinutes ?? null} locked={day.complete} />}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 content-start gap-3 sm:gap-4">
          <Card className={cn(atRisk && "animate-pulse border-warning")}>
            <CardContent className="space-y-1">
              <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Flame className="size-4 text-streak" /> Streak
              </p>
              <p className="tabular font-mono text-2xl font-semibold sm:text-3xl">
                {data.streak} <span className="text-sm text-muted-foreground sm:text-base">day{data.streak === 1 ? "" : "s"}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                best {data.best}
                <span className="flex items-center gap-0.5" aria-label={`${data.freezeTokens} freeze tokens`}>
                  {Array.from({ length: Math.max(data.freezeTokens, 0) }, (_, i) => (
                    <Snowflake key={i} className="size-3.5 text-chart-5" />
                  ))}
                  {data.freezeTokens === 0 && "· no freezes"}
                </span>
              </p>
              {atRisk && <p className="text-xs text-warning">Finish today to keep your streak</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Code2 className="size-4" /> Solved
              </p>
              <p className="tabular font-mono text-2xl font-semibold sm:text-3xl">
                {data.solvedMain} <span className="text-sm text-muted-foreground sm:text-base">/ {mainProblemCount}</span>
              </p>
              <p className={cn("flex items-center gap-1 text-xs", data.pace.delta >= 0 ? "text-success" : "text-destructive")}>
                {data.pace.delta >= 0 ? <TrendingUp className="size-3.5 shrink-0" /> : <TrendingDown className="size-3.5 shrink-0" />}
                {data.pace.delta === 0
                  ? "exactly on pace"
                  : data.pace.delta > 0
                    ? `${data.pace.delta} ahead of plan`
                    : `${-data.pace.delta} behind (ideal ${data.pace.ideal})`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <CalendarClock className="size-4" /> Countdown
              </p>
              <p className="tabular font-mono text-2xl font-semibold sm:text-3xl">{clock.daysLeft}d</p>
              <p className="text-xs text-muted-foreground">to {formatDate(settings.endDate, { day: "numeric", month: "short", year: "numeric" })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <BookOpen className="size-4" /> Phase
              </p>
              <p className="line-clamp-2 text-sm font-medium">{clock.phase?.name ?? "Pre-start"}</p>
              <Progress value={weekFrac * 100} className="h-1.5" aria-label="Plan progress" />
              <p className="tabular text-xs text-muted-foreground">
                Week {Math.max(clock.week, 1)} of {clock.totalWeeks}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="problems" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Today&apos;s problems</CardTitle>
            <CardDescription>Every problem solved today counts: new, review, JS and SQL.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dsa">
                  All <ChevronRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProblemList items={newProblems.map((p) => toItem(p))} empty="No new problems today." />
            {reviews.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Review due</h3>
                <ProblemList items={reviews.map((p) => toItem(p, p.confidence ?? "review"))} />
              </div>
            )}
            {sideTrack.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Side tracks</h3>
                <ProblemList items={sideTrack.map((p) => toItem(p, p.role === "js" ? "JS track" : "SQL"))} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="theory" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Today&apos;s theory</CardTitle>
            <CardDescription>
              {plan.theoryTarget > 0 ? `${plan.theoryTarget} subtopic${plan.theoryTarget === 1 ? "" : "s"} due. Notes live in Learn.` : "Nothing due today."}
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/learn">
                  Learn <ChevronRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <SubtopicChecklist items={data.theory.map((t) => ({ id: t.id, title: t.title, done: t.done, meta: t.topicTitle }))} />
          </CardContent>
        </Card>
      </div>

      <WeeklyMocksCard slots={mockSlots} today={today} compact />

      {day.kind === "sunday" && data.bonus.problems.length + data.bonus.theory.length > 0 && (
        <Card id="bonus">
          <CardHeader>
            <CardTitle>Bonus for your spare hours</CardTitle>
            <CardDescription>Optional. Only the weekly quiz counts toward today, so these never affect your streak.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.bonus.problems.length > 0 && <ProblemList items={data.bonus.problems.map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, pattern: p.pattern, url: p.url, solved: false, tag: "bonus" }))} />}
            {data.bonus.theory.length > 0 && (
              <SubtopicChecklist items={data.bonus.theory.map((t) => ({ id: t.id, title: t.title, done: false, meta: t.topicTitle }))} />
            )}
          </CardContent>
        </Card>
      )}

      {showLeetCode && <LeetCodeCard username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} needsDetails={data.needsDetails} />}

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>The whole plan, week by week.</CardDescription>
          {!showLeetCode && (
            <CardAction>
              <LeetCodeCard compact username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} needsDetails={[]} />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Heatmap cells={data.heatmap} />
        </CardContent>
      </Card>

      {latestNews.length > 0 && (
        <section aria-labelledby="news-strip">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="news-strip" className="flex items-center gap-2 font-medium">
              <Newspaper className="size-4 text-primary" /> AI &amp; engineering news
            </h2>
            <Link href="/news" className="text-sm text-muted-foreground hover:text-primary">
              All news →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {latestNews.map((a) => (
              <NewsCard key={a.id} readingsGoal={READINGS_PER_DAY} item={toCardItem(a, new Date())} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
