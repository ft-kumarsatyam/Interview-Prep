import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProblemList } from "@/modules/progress/components/problem-list";
import { SubtopicChecklist } from "@/modules/progress/components/subtopic-checklist";
import type { DashboardData } from "@/modules/progress/services/dashboard";

/** Optional Sunday extras for spare hours. Never affects the streak. */
export function BonusCard({ bonus }: { bonus: DashboardData["bonus"] }) {
  if (bonus.problems.length + bonus.theory.length === 0) return null;
  return (
    <Card id="bonus">
      <CardHeader>
        <CardTitle>Bonus for your spare hours</CardTitle>
        <CardDescription>Optional. Only the weekly quiz counts toward today, so these never affect your streak.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bonus.problems.length > 0 && (
          <ProblemList
            items={bonus.problems.map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, pattern: p.pattern, url: p.url, solved: false, tag: "bonus" }))}
          />
        )}
        {bonus.theory.length > 0 && <SubtopicChecklist items={bonus.theory.map((t) => ({ id: t.id, title: t.title, done: false, meta: t.topicTitle }))} />}
      </CardContent>
    </Card>
  );
}
