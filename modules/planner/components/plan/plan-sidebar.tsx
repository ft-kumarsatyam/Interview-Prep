import Link from "next/link";
import { Archive, Clock, Compass, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/core/plan-clock";
import { PlanHistory, ResetPlannerButton } from "@/modules/planner/components/plan-history";
import { PlannerForm } from "@/modules/planner/components/planner-form";
import { StudyTimer } from "@/modules/planner/components/study-timer";
import { SNAPSHOT_RETENTION_DAYS } from "@/modules/planner/domain/planner-snapshot";
import type { AppSettings } from "@/modules/settings/services/settings";
import type { SnapshotItem } from "@/modules/planner/services/planner-snapshot";
import type { StudySessionItem } from "@/modules/planner/services/study";

type Props = {
  setupCompleted: boolean;
  snapshots: SnapshotItem[];
  sessions: StudySessionItem[];
  settings: AppSettings;
  hours: number[];
};

/** Plan setup, saved plans, study timer and the goals form. */
export function PlanSidebar({ setupCompleted, snapshots, sessions, settings, hours }: Props) {
  const todayMinutes = sessions.reduce((n, s) => n + s.minutes, 0);
  return (
    <aside className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="size-4" aria-hidden /> Plan setup
          </CardTitle>
          <CardDescription>
            {setupCompleted
              ? "Your ratings, hours and goals drive the plan. Edit any answer, or start over from scratch."
              : "Rate your strengths and weak spots so the plan fits you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/plan/setup">
              <Pencil /> {setupCompleted ? "Edit my answers" : "Start the setup"}
            </Link>
          </Button>
          <ResetPlannerButton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="size-4" aria-hidden /> Saved plans
          </CardTitle>
          <CardDescription>Earlier versions of your planner, kept for {SNAPSHOT_RETENTION_DAYS} days. Restoring one saves your current plan first.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanHistory rows={snapshots.map((s) => ({ ...s, takenOnLabel: formatDate(s.takenOn, { day: "numeric", month: "short", year: "numeric" }) }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" aria-hidden /> Study timer
          </CardTitle>
          <CardDescription>Log real study time. It feeds the study-time and consistency measures.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudyTimer sessions={sessions.map((s) => ({ id: s.id, minutes: s.minutes, kind: s.kind, note: s.note }))} todayMinutes={todayMinutes} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Goals &amp; availability</CardTitle>
        </CardHeader>
        <CardContent>
          <PlannerForm firstTime={!settings.plannerSetupAt} initial={{ ...settings.profile, endDate: settings.endDate, hoursByDow: hours }} />
        </CardContent>
      </Card>
    </aside>
  );
}
