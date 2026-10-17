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
import { selectNextAction, type StudyActionCandidate, type StudyActionKind } from "@/modules/progress/domain/next-action";
import { getDashboard } from "@/modules/progress/services/dashboard";
import { getStreakInsights } from "@/modules/progress/services/streak-insights";
import { streakRisk } from "@/modules/progress/domain/streak-insights";
import { getMistakesOverview } from "@/modules/quiz/services/practice";
import { FixNextCard } from "@/modules/progress/components/dashboard/fix-next-card";
import { ReadinessStrip } from "@/modules/progress/components/dashboard/readiness-strip";
import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { getTargetsOverview } from "@/modules/targets/services/targets";
import { studyGuidance } from "@/modules/progress/domain/study-guidance";
import { getStudyFlow } from "@/modules/study-flow/services/study-flow";
import type { StudyFlowKind } from "@/modules/study-flow/domain/study-flow";

const STUDY_FLOW_KIND_TO_ACTION_KIND: Record<StudyFlowKind, StudyActionKind> = {
  dsa: "dsa",
  review: "review",
  theory: "theory",
  quiz: "quiz",
  course: "backlog",
  roadmap: "backlog",
  practice: "backlog",
};

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
  // One ranked queue (modules/study-flow) feeds both the header CTA and Today's "next" badge,
  // so they can never disagree about what to do next (impeccable critique P1, 2026-10-17).
  const nextAction = selectNextAction({
    kind: day.kind,
    candidates: studyFlow.items.map((item, index): StudyActionCandidate => ({
      kind: STUDY_FLOW_KIND_TO_ACTION_KIND[item.kind],
      title: item.title,
      href: item.href,
      reason: item.reason,
      minutes: item.minutes,
      required: item.bucket === "required",
      done: item.done,
      locked: item.locked,
      rank: index,
    })),
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

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <TodayCard
          description={dayCopy(day.kind, hasBonus)}
          requirements={requirements}
          next={next}
          complete={day.complete}
          showHours={isWorkday(day.kind) || day.kind === "sunday"}
          hours={plan.hours ?? null}
          estMinutes={plan.estMinutes ?? null}
          secondary={studyFlow.items.filter((item): item is typeof item & { bucket: "recommended" | "optional" } => item.bucket !== "required")}
        />
        <StatGrid
          streak={data.streak}
          best={data.best}
          freezeTokens={data.freezeTokens}
          risk={risk}
          next={next}
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

      <FixNextCard mistakes={mistakes} />

      <CollapsibleSection title="Backlog">
        <Suspense fallback={<CardSkeleton />}>
          <BacklogSection today={today} plan={plan} settings={settings} />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="Readiness">
        <ReadinessStrip targets={targets} />
      </CollapsibleSection>
      <CollapsibleSection title="Job search">
        <Suspense fallback={<CardSkeleton />}>
          <JobSearchSection today={today} />
        </Suspense>
      </CollapsibleSection>
      <CollapsibleSection title="This week's mocks">
        <Suspense fallback={<CardSkeleton className="h-40" />}>
          <MocksSection today={today} schedule={settings.mockSchedule} />
        </Suspense>
      </CollapsibleSection>

      {day.kind === "sunday" && (
        <CollapsibleSection title="Sunday bonus" defaultOpen>
          <BonusCard bonus={data.bonus} />
        </CollapsibleSection>
      )}

      <CollapsibleSection title="LeetCode activity">
        {showLeetCode && <LeetCodeCard username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} needsDetails={data.needsDetails} />}
        <ActivityCard heatmap={data.heatmap} username={settings.leetcodeUsername} lastSyncLabel={lastSyncLabel} showLeetCodeCompact={!showLeetCode} />
      </CollapsibleSection>

      <CollapsibleSection title="AI & engineering news">
        <Suspense fallback={<CardSkeleton className="h-56" />}>
          <NewsStrip />
        </Suspense>
      </CollapsibleSection>
    </PageStack>
  );
}
