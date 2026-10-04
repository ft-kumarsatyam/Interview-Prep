import type { Metadata } from "next";
import { CalendarCheck, Clock, Inbox, ListTodo, Moon } from "lucide-react";
import { BacklogBoard, type BoardItem } from "@/modules/progress/components/backlog/backlog-board";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { BACKLOG_KINDS, minutesLabel, type BacklogItem } from "@/modules/progress/domain/backlog-items";
import { addDays, diffDays } from "@/core/domain/dates";
import { formatDate } from "@/core/plan-clock";
import { pullableDays } from "@/modules/planner/domain/pull-days";
import { ensureBacklogQueue, listPulledDates } from "@/modules/progress/services/backlog";
import { ensureToday } from "@/modules/planner/services/plan";

export const metadata: Metadata = { title: "Backlog" };

export default async function BacklogPage() {
  const state = await ensureToday();
  const view = await ensureBacklogQueue({ today: state.today, plan: state.plan, settings: state.settings });
  const planned = await listPulledDates(addDays(state.today, 1));
  const days = pullableDays(addDays(state.today, 1), state.today, state.settings, 6).map((d) => ({ date: d.date, label: formatDate(d.date, { weekday: "short", day: "numeric", month: "short" }) }));
  const toItem = (i: BacklogItem): BoardItem => ({
    key: i.key,
    kind: i.kind,
    title: i.title,
    ...(i.note ? { note: i.note } : {}),
    path: i.path,
    minutes: i.minutes,
    ageDays: i.since ? Math.max(0, diffDays(state.today, i.since)) : null,
    plannedFor: planned.get(i.key) ?? [],
  });
  const empty = view.open.length === 0 && view.snoozed.length === 0 && view.queueDone === 0;

  return (
    <>
      <PageHeader
        icon={Inbox}
        title="Backlog"
        description="Everything you owe beyond today's plan, in one ranked list: reviews, theory, DSA behind pace, topic quizzes, system design, missed mocks, target-company gaps and saved articles."
      />
      {empty ? (
        <EmptyState icon={CalendarCheck} title="Nothing owed. You're on top of it.">
          <p>Anything that falls behind the plan will show up here, ranked, with a small daily queue picked for you.</p>
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={ListTodo} label="Owed" value={String(view.open.length)} hint={`${BACKLOG_KINDS.filter((k) => view.byKind[k] > 0).length} kinds`} tone={view.open.length > state.settings.carryLimits.total ? "danger" : view.open.length > 0 ? "warning" : "success"} />
            <StatTile icon={Clock} label="Time to clear" value={minutesLabel(view.totalMinutes)} hint="a rough estimate" />
            <StatTile icon={CalendarCheck} label="Queued today" value={`${view.queue.length + view.queueDone}`} hint={`${view.queueDone} done · budget ${view.budget}`} tone="primary" />
            <StatTile icon={Moon} label="Snoozed" value={String(view.snoozed.length)} hint={view.dismissedCount ? `${view.dismissedCount} dismissed` : "none dismissed"} />
          </div>
          <BacklogBoard
            items={view.open.map(toItem)}
            queue={view.queue.map(toItem)}
            snoozed={view.snoozed.map(toItem)}
            kinds={BACKLOG_KINDS.filter((k) => view.byKind[k] > 0).map((kind) => ({ kind, count: view.byKind[kind] }))}
            dismissedCount={view.dismissedCount}
            budget={view.budget}
            queueDone={view.queueDone}
            days={days}
            carryLimits={state.settings.carryLimits}
          />
        </div>
      )}
    </>
  );
}
