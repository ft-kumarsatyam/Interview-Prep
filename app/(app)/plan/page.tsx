import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/core/plan-clock";
import { FeasibilityCard } from "@/modules/planner/components/intake-wizard";
import { PauseCard } from "@/modules/planner/components/pause-card";
import { ChangeLogCard } from "@/modules/planner/components/plan/change-log-card";
import { IndicatorsCard } from "@/modules/planner/components/plan/indicators-card";
import { KIND_LABEL } from "@/modules/planner/components/plan/labels";
import { PlanSidebar } from "@/modules/planner/components/plan/plan-sidebar";
import { SprintCard } from "@/modules/planner/components/plan/sprint-card";
import { StrengthsCard } from "@/modules/planner/components/plan/strengths-card";
import { ProposalCard } from "@/modules/planner/components/proposal-card";
import { RemedyActions } from "@/modules/planner/components/remedy-actions";
import { WhyThisPlan } from "@/modules/planner/components/why-this-plan";
import { futureRestCount } from "@/modules/planner/domain/pause";
import { DEFAULT_HOURS } from "@/modules/planner/domain/time-budget";
import { getDayExplanation } from "@/modules/planner/services/explain-day";
import { loadPersonalisation } from "@/modules/planner/services/intake-weights";
import { ensureToday } from "@/modules/planner/services/plan";
import { listPlanChanges } from "@/modules/planner/services/plan-log";
import { getIndicators, getSprintView } from "@/modules/planner/services/planner";
import { getFeasibility } from "@/modules/planner/services/planner-intake";
import { listSnapshots } from "@/modules/planner/services/planner-snapshot";
import { proposeRebalance } from "@/modules/planner/services/rebalance";
import { listStudySessions } from "@/modules/planner/services/study";

export const metadata: Metadata = { title: "Planner" };

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const { w } = await searchParams;
  const raw = Array.isArray(w) ? w[0] : w;
  const requested = raw && /^\d{1,3}$/.test(raw) ? Number(raw) : undefined;
  // One bootstrap per request, shared by everything below.
  const state = await ensureToday();
  const settings = state.settings;
  const personal = await loadPersonalisation();
  if (!personal.completed && !settings.plannerSetupAt) redirect("/plan/setup");
  const [sprint, indicators, changes, feasibility, proposal, todayReasons, snapshots] = await Promise.all([
    getSprintView(requested, undefined, state),
    getIndicators(undefined, state),
    listPlanChanges(20),
    getFeasibility(),
    personal.completed ? proposeRebalance() : Promise.resolve(null),
    getDayExplanation(state.today),
    listSnapshots(),
  ]);
  const strengths = [...personal.weights.values()].sort((a, b) => a.strength - b.strength).slice(0, 12);
  const todaySessions = await listStudySessions(sprint.today, sprint.today);
  const hours = settings.hoursByDow?.length === 7 ? [...settings.hoursByDow] : [...DEFAULT_HOURS];
  const isWorkDay = state.plan.kind === "study" || state.plan.kind === "revision";

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
            <CardContent className="space-y-3">
              <FeasibilityCard f={feasibility} hideRemedies />
              <RemedyActions remedies={feasibility.remedies} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>
                {formatDate(state.today, { weekday: "long", day: "numeric", month: "short" })} · {KIND_LABEL[state.plan.kind]}
                {isWorkDay ? ` · DSA ${state.plan.dsaTarget}, theory ${state.plan.theoryTarget}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhyThisPlan reasons={todayReasons} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pause or skip days</CardTitle>
              <CardDescription>Taking a break? Pause from tomorrow and the plan re-spreads the work over the days left.</CardDescription>
            </CardHeader>
            <CardContent>
              <PauseCard pausedAhead={futureRestCount(settings.restDays, state.today)} status={feasibility.status} coveragePct={Math.round(feasibility.coverage * 100)} />
            </CardContent>
          </Card>
          <SprintCard sprint={sprint} />
          <IndicatorsCard indicators={indicators} />
          <StrengthsCard strengths={strengths} />
          <ChangeLogCard changes={changes} />
        </div>

        <PlanSidebar setupCompleted={personal.completed} snapshots={snapshots} sessions={todaySessions} settings={settings} hours={hours} />
      </div>
    </>
  );
}
