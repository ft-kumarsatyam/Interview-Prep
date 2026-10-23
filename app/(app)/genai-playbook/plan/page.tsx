import type { Metadata } from "next";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { focusDate, weekForDate, weekProgress } from "@/modules/genai-playbook/domain/playbook";
import { getPlaybookState } from "@/modules/genai-playbook/services/progress";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI playbook · Plan" };

export default async function GenaiPlaybookPlanPage() {
  const [state, settings] = await Promise.all([getPlaybookState(), getSettings()]);
  const current = weekForDate(plan, focusDate(plan, todayIn(settings)))?.id;

  return (
    <section className="space-y-3">
      <h1 className="text-lg font-semibold">23-week plan</h1>
      <ol className="space-y-2">
        {plan.weeks.map((w) => {
          const wp = weekProgress(plan, w.id, state.completed);
          return (
            <li key={w.id} id={w.id} className={`rounded-lg border p-3 ${w.id === current ? "border-primary bg-card" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {w.id.toUpperCase()} · {w.start} to {w.end}
                    {w.id === current ? " · now" : ""}
                  </p>
                  <p className="font-medium">{w.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{w.practice}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Proof artifact: {w.artifact}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">
                  {wp.done}/{wp.total}
                </span>
              </div>
              <Progress value={wp.pct} className="mt-2 h-1" aria-label={`${w.title} progress`} />
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link href={`/genai-playbook/today?date=${w.start}`} className="text-primary underline-offset-4 hover:underline">
                  Open week
                </Link>
                <Link href={`/courses/${w.lesson}`} className="text-primary underline-offset-4 hover:underline">
                  Lesson
                </Link>
                <Link href={`/roadmaps/genai-interview-playbook`} className="text-primary underline-offset-4 hover:underline">
                  Roadmap
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
