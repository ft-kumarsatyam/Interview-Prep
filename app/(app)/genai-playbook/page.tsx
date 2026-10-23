import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, GraduationCap, Route, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { daysLeft, focusDate, latestReadiness, overallProgress, phase, weakDomains, weekForDate, weekProgress } from "@/modules/genai-playbook/domain/playbook";
import { READINESS_DOMAINS } from "@/modules/genai-playbook/domain/schemas";
import { getPlaybookState } from "@/modules/genai-playbook/services/progress";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "GenAI playbook" };

export default async function GenaiPlaybookOverviewPage() {
  const [state, settings] = await Promise.all([getPlaybookState(), getSettings()]);
  const today = todayIn(settings);
  const overall = overallProgress(plan, state.completed);
  const week = weekForDate(plan, focusDate(plan, today));
  const wp = week ? weekProgress(plan, week.id, state.completed) : null;
  const latest = latestReadiness(state.reviews);
  const weak = weakDomains(latest);
  const ph = phase(plan, today);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Target}
        title="GenAI interview playbook"
        description="23 weeks, Oct 26 2026 to Mar 31 2027: a daily interview block next to your DSA habit. Progress here never changes your daily plan or streak."
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {ph === "before" ? "Starts Oct 26" : ph === "after" ? "Window finished" : `${daysLeft(plan, today)} days left`}
          </span>
          <span className="font-mono tabular">
            {overall.done}/{overall.total} tasks
          </span>
        </div>
        <Progress value={overall.pct} aria-label="Playbook progress" className="h-2" />
      </div>
      {week && wp && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {ph === "before" ? "First week" : "This week"} · {week.start} to {week.end}
          </p>
          <p className="mt-1 font-medium">{week.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{week.practice}</p>
          <p className="mt-1 text-xs text-muted-foreground">Proof artifact: {week.artifact}</p>
          <Progress value={wp.pct} className="mt-3 h-1" aria-label="This week's progress" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/genai-playbook/today">Open today</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/courses/${week.lesson}`}>Read the lesson</Link>
            </Button>
          </div>
        </div>
      )}
      {weak.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-card p-4 text-sm">
          <p className="font-medium">Below 3 on your latest review</p>
          <p className="mt-1 text-muted-foreground">
            {weak.map((id) => READINESS_DOMAINS.find((d) => d.id === id)?.label).join(", ")}. Schedule two focused sessions on each next week instead of watching unrelated tutorials.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/roadmaps/genai-interview-playbook">
            <Route className="size-4" aria-hidden />
            Roadmap
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/genai-test">
            <ClipboardCheck className="size-4" aria-hidden />
            Weekly test
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/courses/genai-playbook">
            <GraduationCap className="size-4" aria-hidden />
            Playbook course
          </Link>
        </Button>
      </div>
    </div>
  );
}
