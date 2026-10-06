import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/core/auth/dal";
import { mainProblemCount } from "@/core/content";
import { planClock } from "@/core/plan-clock";
import { recordLatency, startTimer } from "@/core/observability/latency";
import { PageStack } from "@/components/shared/page-stack";
import { Skeleton } from "@/components/ui/skeleton";
import { LeetCodeCard } from "@/modules/dsa/components/leetcode/leetcode-card";
import { syncLeetCode } from "@/modules/dsa/services/leetcode-sync";
import { READINGS_PER_DAY } from "@/modules/planner/domain/plan-config";
import { ActivityCard } from "@/modules/progress/components/dashboard/activity-card";
import { BacklogSection } from "@/modules/progress/components/dashboard/backlog-section";
import { CarrySection } from "@/modules/planner/components/carry-section";
import { JobSearchSection } from "@/modules/jobs/components/job-search-section";
import { BonusCard } from "@/modules/progress/components/dashboard/bonus-card";
import { DashboardHeader } from "@/modules/progress/components/dashboard/dashboard-header";
import { MocksSection } from "@/modules/progress/components/dashboard/mocks-section";
import { NewsStrip } from "@/modules/progress/components/dashboard/news-strip-section";
import { NotificationBanner } from "@/modules/progress/components/dashboard/notification-banner";
import { PlanUpdateSection } from "@/modules/progress/components/dashboard/plan-update-section";
import { ProblemsCard } from "@/modules/progress/components/dashboard/problems-card";
import { SetupSection } from "@/modules/progress/components/dashboard/setup-section";
import { StatGrid } from "@/modules/progress/components/dashboard/stat-grid";
import { TheoryCard } from "@/modules/progress/components/dashboard/theory-card";
import { TodayCard } from "@/modules/progress/components/dashboard/today-card";
import { buildRequirements, dayCopy, greetingFor, isWorkday, localHour, nextRequirement } from "@/modules/progress/domain/dashboard-view";
import { selectNextAction, type StudyActionCandidate } from "@/modules/progress/domain/next-action";
import { getDashboard } from "@/modules/progress/services/dashboard";
import { getStreakInsights } from "@/modules/progress/services/streak-insights";
import { streakRisk } from "@/modules/progress/domain/streak-insights";
import { getMistakesOverview } from "@/modules/quiz/services/practice";
import { FixNextCard } from "@/modules/progress/components/dashboard/fix-next-card";
import { ReadinessStrip } from "@/modules/progress/components/dashboard/readiness-strip";
import { getTargetsOverview } from "@/modules/targets/services/targets";
import { studyGuidance } from "@/modules/progress/domain/study-guidance";
import { getStudyFlow } from "@/modules/study-flow/services/study-flow";
import { StudyFlowCard } from "@/modules/study-flow/components/study-flow-card";

export const metadata: Metadata = { title: "Dashboard" };

const CardSkeleton = ({ className = "h-32" }: { className?: string }) => <Skeleton className={`${className} rounded-xl`} aria-hidden />;

export default async function DashboardPage() {
  const elapsed = startTimer();
  const session = await currentSession();
  const data = await getDashboard();
  const [mistakes, targets, studyFlow] = await Promise.all([getMistakesOverview(5), getTargetsOverview(), getStudyFlow(data)]);
  const { day, plan, settings, today } = data;

  const clock = planClock(settings);
  const hour = localHour(settings.timezone);
  const requirements = buildRequirements(day, READINGS_PER_DAY);
  const next = nextRequirement(requirements, day);
  const nextAction = selectNextAction({
    kind: day.kind,
    candidates: [
      ...data.problems.map((problem, index): StudyActionCandidate => ({
        kind: problem.role === "review" ? "review" : "dsa",
        title: problem.title,
        href: `/dsa/${problem.slug}`,
        reason: problem.role === "review" ? "Due spaced-repetition review" : "Today's frozen plan",
        minutes: problem.difficulty === "Hard" ? 55 : problem.difficulty === "Medium" ? 35 : 20,
        required: true,
        done: problem.solvedToday,
        rank: problem.role === "review" ? 5 + index : 10 + index,
      })),
      ...data.theory.map((topic, index): StudyActionCandidate => ({
        kind: "theory",
        title: topic.title,
        href: `/learn/${topic.topicId}`,
        reason: "Today's theory target",
        minutes: 25,
        required: true,
        done: topic.done,
        rank: 20 + index,
      })),
      {
        kind: "quiz",
        title: day.kind === "sunday" ? "Weekly quiz" : "Daily quiz",
        href: "/quiz",
        reason: day.quizPassed ? "Already passed" : "Required to complete the day",
        required: true,
        done: day.quizPassed,
        locked: !day.quizUnlocked && !day.quizPassed,
        rank: 40,
      },
      ...(!day.complete
        ? [{
            kind: "backlog" as const,
            title: "Choose an optional backlog item",
            href: "/backlog",
            reason: "Optional work after today's required targets",
            required: false,
            rank: 100,
          }]
        : []),
    ],
  });
  const guidance = studyGuidance({
    minutesAvailable: Math.round((plan.hours ?? 0) * 60),
    requiredMinutes: plan.estMinutes ?? 0,
    backlogMinutes: 0,
    paceRatio: data.pace.ideal > 0 ? data.pace.solved / data.pace.ideal : 1,
  });
  const insights = await getStreakInsights(today, data.freezeTokens);
  const risk = streakRisk({ kind: day.kind, complete: day.complete, streak: data.streak, tokens: data.freezeTokens, now: new Date(), timeZone: settings.timezone, left: requirements.filter((r) => !r.done && !r.label.includes("bonus")).map((r) => r.label) });
  const hasBonus = data.bonus.problems.length + data.bonus.theory.length > 0;
  const showLeetCode = !settings.leetcodeUsername || data.needsDetails.length > 0;
  // Server time of the work the page waits for (the streamed sections are separate). Feeds the dashboard SLO on /setup.
  // LeetCode is an enrichment and must never delay the plan or today's actions.
  after(() => {
    void syncLeetCode().catch(() => null);
    recordLatency("dashboard", elapsed(), { timeZone: settings.timezone });
  });
  const lastSyncLabel = settings.leetcodeLastSyncAt
    ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: settings.timezone }).format(settings.leetcodeLastSyncAt)
    : null;

  return (
    <PageStack>
      <DashboardHeader greeting={greetingFor(hour)} today={today} clock={clock} next={nextAction} guidance={guidance} complete={day.complete} />

      <Suspense fallback={null}>
        <PlanUpdateSection today={today} settings={settings} solved={data.pace.solved} />
      </Suspense>
      <Suspense fallback={null}>
        <SetupSection remember={session.remember} />
      </Suspense>
      <Suspense fallback={null}>
        <CarrySection today={today} plan={plan} settings={settings} />
      </Suspense>
      <NotificationBanner notification={data.unreadNotifications[0]} />
      <StudyFlowCard items={studyFlow.items} nextId={studyFlow.next?.id} />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <TodayCard
          description={dayCopy(day.kind, hasBonus)}
          requirements={requirements}
          next={next}
          complete={day.complete}
          showHours={isWorkday(day.kind) || day.kind === "sunday"}
          hours={plan.hours ?? null}
          estMinutes={plan.estMinutes ?? null}
        />
        <StatGrid
          streak={data.streak}
          best={data.best}
          freezeTokens={data.freezeTokens}
          risk={risk}
          freeze={insights.freeze}
          streakWeek={insights.week}
          solvedMain={data.solvedMain}
          mainTotal={mainProblemCount}
          pace={data.pace}
          daysLeft={clock.daysLeft}
          endDate={settings.endDate}
          phaseName={clock.phase?.name}
          week={clock.week}
          totalWeeks={clock.totalWeeks}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProblemsCard problems={data.problems} />
        <TheoryCard theory={data.theory} target={plan.theoryTarget} />
      </div>

      <Suspense fallback={<CardSkeleton />}>
        <BacklogSection today={today} plan={plan} settings={settings} />
      </Suspense>
      <FixNextCard mistakes={mistakes} />
      <ReadinessStrip targets={targets} />
      <Suspense fallback={<CardSkeleton />}>
        <JobSearchSection today={today} />
      </Suspense>
      <Suspense fallback={<CardSkeleton className="h-40" />}>
        <MocksSection today={today} schedule={settings.mockSchedule} />
      </Suspense>

      {day.kind === "sunday" && <BonusCard bonus={data.bonus} />}

      {showLeetCode && <LeetCodeCard username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} needsDetails={data.needsDetails} />}
      <ActivityCard heatmap={data.heatmap} username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} showLeetCodeCompact={!showLeetCode} />

      <Suspense fallback={<CardSkeleton className="h-56" />}>
        <NewsStrip />
      </Suspense>
    </PageStack>
  );
}
