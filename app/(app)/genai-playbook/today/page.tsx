import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { addDays, isDateStr } from "@/core/domain/dates";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { countDone, dayOf, focusDate, weekById } from "@/modules/genai-playbook/domain/playbook";
import { PlaybookTaskRow } from "@/modules/genai-playbook/components/task-row";
import { getPlaybookState } from "@/modules/genai-playbook/services/progress";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI playbook · Today" };

export default async function GenaiPlaybookTodayPage({ searchParams }: PageProps<"/genai-playbook/today">) {
  const [state, settings, sp] = await Promise.all([getPlaybookState(), getSettings(), searchParams]);
  const today = todayIn(settings);
  const asked = typeof sp.date === "string" && isDateStr(sp.date) ? sp.date : undefined;
  const date = asked && asked >= plan.start_date && asked <= plan.end_date ? asked : focusDate(plan, today);
  const day = dayOf(plan, date);
  const week = day ? weekById(plan, day.week) : undefined;
  const prev = date > plan.start_date ? addDays(date, -1) : null;
  const next = date < plan.end_date ? addDays(date, 1) : null;
  const progress = day ? countDone(day.tasks, state.completed) : null;

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarCheck} title={day ? `${day.weekday}, ${date}` : "Today"} description={week ? `${week.id.toUpperCase()} · ${week.title}` : "Outside the playbook window."} />
      {date !== today && <p className="text-sm text-muted-foreground">Showing {date}{today < plan.start_date ? " (the playbook starts here)" : today > plan.end_date ? " (the window has finished)" : ""}.</p>}
      {day && progress ? (
        <>
          <p className="text-sm text-muted-foreground">
            {progress.done}/{progress.total} done · {progress.minutesDone}/{progress.minutesTotal} min
          </p>
          <ul className="space-y-2">
            {day.tasks.map((t) => (
              <PlaybookTaskRow key={t.id} task={t} done={t.id in state.completed} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No tasks for this date.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {prev && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/genai-playbook/today?date=${prev}`}>Previous day</Link>
          </Button>
        )}
        {date !== focusDate(plan, today) && (
          <Button asChild variant="outline" size="sm">
            <Link href="/genai-playbook/today">Back to today</Link>
          </Button>
        )}
        {next && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/genai-playbook/today?date=${next}`}>Next day</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/genai-playbook/plan">Full plan</Link>
        </Button>
      </div>
    </div>
  );
}
