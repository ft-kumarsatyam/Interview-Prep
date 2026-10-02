import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, Code2, Flame, Lock, ListChecks, Newspaper, Snowflake, TrendingDown, TrendingUp } from "lucide-react";
import { Heatmap } from "@/components/dashboard/heatmap";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { ProblemList } from "@/components/progress/problem-list";
import { SubtopicChecklist } from "@/components/progress/subtopic-checklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewsCard } from "@/components/news/news-card";
import { mainProblemCount, news } from "@/lib/content";
import { timeAgo } from "@/lib/domain/news";
import { READINGS_PER_DAY } from "@/lib/domain/plan-config";
import { listArticles } from "@/lib/services/news";
import { formatDate, planClock } from "@/lib/plan-clock";
import { getDashboard, type PlanProblem } from "@/lib/services/dashboard";
import { syncLeetCode } from "@/lib/services/leetcode-sync";
import { LeetCodeCard } from "@/components/leetcode/leetcode-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const newsCategoryName = new Map(news.categories.map((c) => [c.id, c.name]));

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

export default async function DashboardPage() {
  // Throttled to once per 10 min; a LeetCode outage must never break the dashboard.
  await syncLeetCode().catch(() => null);
  const [data, latestNews] = await Promise.all([getDashboard(), listArticles({ filter: "unread", limit: 3 })]);
  const { day, plan, settings, today } = data;
  const clock = planClock(settings);
  const hour = localHour(settings.timezone);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const workday = day.kind === "study" || day.kind === "revision";

  const requirements = workday
    ? [
        { label: "DSA", value: `${day.dsaSolved}/${day.dsaTarget}`, done: day.dsaSolved >= day.dsaTarget, href: "#problems", icon: Code2 },
        { label: "Theory", value: `${day.theoryDone}/${day.theoryTarget}`, done: day.theoryDone >= day.theoryTarget, href: "#theory", icon: BookOpen },
        { label: "Read (bonus)", value: `${day.readings}/${READINGS_PER_DAY}`, done: day.readings >= READINGS_PER_DAY, href: "/news", icon: Newspaper },
        {
          label: "Daily quiz",
          value: day.quizPassed ? "passed" : day.quizUnlocked ? "unlocked" : "locked",
          done: day.quizPassed,
          href: "/quiz",
          icon: day.quizUnlocked || day.quizPassed ? ListChecks : Lock,
        },
      ]
    : day.kind === "sunday"
      ? [{ label: "Weekly quiz", value: day.quizPassed ? "passed" : "open", done: day.quizPassed, href: "/quiz", icon: ListChecks }]
      : [];
  const doneCount = requirements.filter((r) => r.done).length;

  const newProblems = data.problems.filter((p) => p.role === "new");
  const reviews = data.problems.filter((p) => p.role === "review");
  const sideTrack = data.problems.filter((p) => p.role === "js" || p.role === "sql");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {process.env.ADMIN_NAME || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {clock.week === 0
            ? `Plan starts in ${clock.daysUntilStart} day${clock.daysUntilStart === 1 ? "" : "s"}`
            : `Week ${clock.week} of ${clock.totalWeeks} · ${clock.phase?.name}`}
        </p>
      </div>

      {data.unreadNotifications.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm" role="status">
          <p className="font-medium">{data.unreadNotifications[0].title}</p>
          {data.unreadNotifications[0].body && <p className="text-muted-foreground">{data.unreadNotifications[0].body}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>
              {day.kind === "outside"
                ? "Outside the plan window. Warm up with anything below."
                : day.kind === "rest"
                  ? "Rest day: counts as complete. Recharge."
                  : day.kind === "sunday"
                    ? "Sunday: reviews + the weekly quiz."
                    : day.kind === "revision"
                      ? "Revision phase: timed problems and reviews."
                      : "Hit every target and pass the quiz to keep the streak."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <ProgressRing done={doneCount} total={requirements.length} complete={day.complete} />
            <ul className="w-full space-y-2">
              {requirements.map((r) => (
                <li key={r.label}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted">
                    <r.icon className={cn("size-4", r.done ? "text-success" : "text-muted-foreground")} />
                    <span className={cn("flex-1", r.done && "text-muted-foreground line-through")}>{r.label}</span>
                    <span className="tabular font-mono text-xs">{r.value}</span>
                  </Link>
                </li>
              ))}
              {requirements.length === 0 && <li className="text-sm text-muted-foreground">No targets today.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card className={cn(!day.complete && workday && hour >= 20 && "animate-pulse border-warning")}>
          <CardContent className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="size-4 text-streak" /> Streak
            </p>
            <p className="tabular font-mono text-3xl font-semibold">
              {data.streak} <span className="text-base text-muted-foreground">day{data.streak === 1 ? "" : "s"}</span>
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              best {data.best} ·
              <span className="flex items-center gap-0.5" aria-label={`${data.freezeTokens} freeze tokens`}>
                {Array.from({ length: Math.max(data.freezeTokens, 0) }, (_, i) => (
                  <Snowflake key={i} className="size-3.5 text-chart-5" />
                ))}
                {data.freezeTokens === 0 && "no freezes"}
              </span>
            </p>
            {!day.complete && workday && hour >= 20 && <p className="text-xs text-warning">Finish today to keep your streak</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code2 className="size-4" /> Solved
            </p>
            <p className="tabular font-mono text-3xl font-semibold">
              {data.solvedMain} <span className="text-base text-muted-foreground">/ {mainProblemCount}</span>
            </p>
            <p className={cn("flex items-center gap-1 text-xs", data.pace.delta >= 0 ? "text-success" : "text-destructive")}>
              {data.pace.delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {data.pace.delta === 0
                ? "exactly on pace"
                : data.pace.delta > 0
                  ? `${data.pace.delta} ahead of plan`
                  : `${-data.pace.delta} behind plan (ideal ${data.pace.ideal})`}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" /> Countdown
              </p>
              <p className="tabular font-mono text-3xl font-semibold">{clock.daysLeft}d</p>
              <p className="text-xs text-muted-foreground">to {formatDate(settings.endDate, { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Week {Math.max(clock.week, 1)} of {clock.totalWeeks}</p>
              <p>{clock.phase?.name ?? "Pre-start"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <LeetCodeCard
        username={settings.leetcodeUsername}
        lastSyncLabel={
          settings.leetcodeLastSyncAt
            ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: settings.timezone }).format(
                settings.leetcodeLastSyncAt,
              )
            : null
        }
        needsDetails={data.needsDetails}
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>The whole plan, week by week.</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap cells={data.heatmap} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card id="problems">
          <CardHeader>
            <CardTitle>Today&apos;s problems</CardTitle>
            <CardDescription>Every problem solved today counts: new, review, JS and SQL.</CardDescription>
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

        <Card id="theory">
          <CardHeader>
            <CardTitle>Today&apos;s theory</CardTitle>
            <CardDescription>
              {plan.theoryTarget > 0 ? `${plan.theoryTarget} subtopic${plan.theoryTarget === 1 ? "" : "s"} due. Notes live in Learn.` : "Nothing due today."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubtopicChecklist items={data.theory.map((t) => ({ id: t.id, title: t.title, done: t.done, meta: t.topicTitle }))} />
          </CardContent>
        </Card>
      </div>

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
              <NewsCard
                key={a.id}
                readingsGoal={READINGS_PER_DAY}
                item={{ ...a, categoryName: newsCategoryName.get(a.category) ?? a.category, age: a.publishedAt ? timeAgo(new Date(a.publishedAt), new Date()) : null }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
